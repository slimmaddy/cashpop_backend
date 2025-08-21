import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { AuthProvider, UserRole } from "../users/entities/user.entity";
import { ValkeyService, OtpType } from "../services/valkey.service";
import { MailerService } from "../services/mailer.service";
import { SmsService } from "../services/sms.service";
import { TokenService } from "./token.service";
import { PhoneVerificationSession } from "./entities/phone-verification-session.entity";
import { ResidenceRegistrationValidator } from "./validators/residence-registration.validator";
import {
  InitiatePhoneVerificationDto,
  VerifyPhoneOtpDto,
  PhoneVerificationResponseDto,
  PhoneVerificationStatusDto,
} from "./dto/phone-verification.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_MINUTES = 60;

  constructor(
    private usersService: UsersService,
    private valkeyService: ValkeyService,
    private mailerService: MailerService,
    private smsService: SmsService,
    private tokenService: TokenService,
    private configService: ConfigService,
    @InjectRepository(PhoneVerificationSession)
    private sessionRepository: Repository<PhoneVerificationSession>
  ) {}

  private generateOtp() {
    // Generate a random 4-digit OTP
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await user.validatePassword(password))) {
      const { password, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Validates a refresh token for a user
   * @param username The username of the user
   * @param refreshToken The refresh token to validate
   * @returns Object with user data and validation status, or null if user not found
   */
  async validateRefreshToken(
    username: string,
    refreshToken: string
  ): Promise<{ user: any; status: string } | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    // Get refresh token expiration time from ConfigService
    const refreshExpSec = this.configService.get<number>(
      "REFRESH_TOKEN_EXPIRATION_IN_SEC",
      604800
    );

    // Pass the expiration time to the User entity's validateRefreshToken method
    const validationResult = await user.validateRefreshToken(
      refreshToken,
      refreshExpSec
    );

    if (validationResult.isValid) {
      const { password, refreshToken, ...result } = user;
      return { user: result, status: "valid" };
    }

    // Return the validation status even if the token is invalid
    return { user: null, status: validationResult.status };
  }

  async login(user: any) {
    const tokens = await this.tokenService.generateAuthTokens(user.id, user.email, user.role);
    // Store the hashed refresh token in the database
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      },
      ...tokens,
    };
  }

  /**
   * Register a new user with verified email token
   * @param createUserDto DTO with username, password, and token
   * @returns User and authentication tokens
   */
  async register(createUserDto: CreateUserDto) {
    try {
      // Check if email already exists
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email
      );
      if (existingUser) {
        throw new ConflictException("Email already exists");
      }

      // Create the user
      const refreshToken = this.tokenService.generateRefreshToken();
      const user = await this.usersService.create({
        email: createUserDto.email,
        username: createUserDto.username,
        name: createUserDto.name,
        password: createUserDto.password,
        invitedCode: createUserDto.invitedCode,
        refreshToken,
        refreshTokenCreatedAt: new Date(),
      });

      // Generate tokens
      const accessToken = await this.tokenService.generateAccessToken(user.id,user.email,user.role);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        refreshToken,
        accessToken,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException("Registration failed");
    }
  }

  async refreshTokens(user: any) {
    // Fetch full user info to get role
    const fullUser = await this.usersService.findById(user.userId);
    // Generate new tokens
    const accessToken = await this.tokenService.generateAccessToken(user.id, user.email, user.role);
    return { accessToken };
  }

  async logout(user: any) {
    await this.usersService.setRefreshToken(user.id, null);
    return { message: "Logout successful" };
  }

  async facebookLogin(email: string, providerId: string, name: string) {
    let user = await this.usersService.findByEmail(email);

    if (user) {
      // If user exists but is not a Facebook user, return error
      if (user.provider !== AuthProvider.FACEBOOK) {
        throw new ConflictException(
          "Email already registered with a different method"
        );
      }
    } else {
      // Create new user if not exists
      user = await this.usersService.createFacebookUser(
        email,
        providerId,
        name
      );
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id, user.email, user.role);

    // Store the hashed refresh token in the databasededdreer
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async lineLogin(email: string, providerId: string, name: string) {
    // Validate that email is not a placeholder
    if (!email || email.includes("line.placeholder")) {
      throw new BadRequestException(
        "LINE authentication requires a valid email address. Please ensure your LINE account has an email and grant email permission."
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException(
        "LINE authentication failed: Invalid email format received from LINE."
      );
    }

    // Try to find user by LINE providerId first
    let user = await this.usersService.findByProviderId(
      providerId,
      AuthProvider.LINE
    );

    if (!user) {
      // If not found by providerId, try finding by email
      user = await this.usersService.findByEmail(email);

      if (user) {
        // If user exists with this email but different provider, check conflict
        if (user.provider !== AuthProvider.LINE) {
          throw new ConflictException(
            `This email is already registered with ${user.provider} authentication. Please use the same login method.`
          );
        }

        // Update providerId if user exists with same email but different LINE ID
        if (user.providerId !== providerId) {
          await this.usersService.updateProviderId(user.id, providerId);
          user.providerId = providerId;
        }
      }
    } else {
      // User found by providerId, check if email changed
      if (user.email !== email) {
        // Check if new email is already taken by another user
        const existingEmailUser = await this.usersService.findByEmail(email);
        if (existingEmailUser && existingEmailUser.id !== user.id) {
          throw new ConflictException(
            "This email is already registered with another account."
          );
        }

        // Update user's email
        await this.usersService.updateUserEmail(user.id, email);
        user.email = email;
      }
    }

    // Create new user if not exists
    if (!user) {
      user = await this.usersService.createLineUser(email, providerId, name);
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id,user.email, user.role);

    // Store the hashed refresh token in the database
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        provider: user.provider,
        role: user.role,
      },
    };
  }

  /**
   * Initiate email verification by sending OTP
   * @param email Email address to verify
   * @returns Message indicating verification email was sent
   */
  async initiateEmailVerification(email: string) {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    // Check if OTP already exists for this email
    const existingOtp = await this.valkeyService.getOtp(
      email,
      OtpType.REGISTRATION
    );
    if (existingOtp) {
      throw new BadRequestException(
        "OTP already sent to this email address. Please check your inbox or try again after 5 minutes."
      );
    }

    const otp = this.generateOtp();

    // Store OTP in Valkey (with 5 minutes TTL as configured in ValkeyService)
    await this.valkeyService.storeOtp(email, otp, OtpType.REGISTRATION, 5 * 60);

    // Send OTP via email
    await this.mailerService.sendOtpEmail(email, otp);

    return {
      message: "Verification email sent",
    };
  }

  /**
   * Verify email with OTP
   * @param email Email address to verify
   * @param otp One-time password
   * @returns Verification status and token
   */
  async verifyEmailOtp(email: string, otp: string) {
    // Get stored OTP from Valkey
    const storedOtpData = await this.valkeyService.getOtp(
      email,
      OtpType.REGISTRATION
    );

    if (!storedOtpData) {
      throw new BadRequestException("OTP expired or not found");
    }

    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      throw new BadRequestException("Invalid OTP");
    }

    // Generate a short-lived JWT token with email in payload
    const token = await this.tokenService.generateEmailVerificationToken(email);

    return {
      message: "Email verified successfully",
      verified: true,
      token,
    };
  }

  /**
   * Initiate password reset by sending OTP
   * @param email Email address for password reset
   * @returns Message indicating password reset email was sent
   */
  async initiatePasswordReset(email: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is not a local user (cannot reset password for social login users)
    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        `${
          user.provider.charAt(0).toUpperCase() + user.provider.slice(1)
        } users cannot reset password. Please use ${user.provider} login.`
      );
    }

    // Check if OTP already exists for this email
    const existingOtp = await this.valkeyService.getOtp(
      email,
      OtpType.PASSWORD_RESET
    );
    if (existingOtp) {
      throw new BadRequestException(
        "OTP already sent to this email address. Please check your inbox or try again after 5 minutes."
      );
    }

    const otp = this.generateOtp();

    // Store OTP in Valkey (with 5 minutes TTL as configured in ValkeyService)
    await this.valkeyService.storeOtp(
      email,
      otp,
      OtpType.PASSWORD_RESET,
      5 * 60
    );

    // Send OTP via email
    await this.mailerService.sendPasswordResetOtpEmail(email, otp);

    return {
      message: "Password reset email sent",
    };
  }

  /**
   * Verify password reset OTP
   * @param email Email address for password reset
   * @param otp One-time password
   * @returns Verification status and token
   */
  async verifyPasswordResetOtp(email: string, otp: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Get stored OTP from Valkey
    const storedOtpData = await this.valkeyService.getOtp(
      email,
      OtpType.PASSWORD_RESET
    );

    if (!storedOtpData) {
      throw new BadRequestException("OTP expired or not found");
    }

    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      throw new BadRequestException("Invalid OTP");
    }

    // Generate a short-lived JWT token with email in payload
    const token = await this.tokenService.generateEmailVerificationToken(email);

    return {
      message: "OTP verified successfully",
      verified: true,
      token,
    };
  }

  /**
   * Reset password after OTP verification
   * @param email Email address of the user
   * @param password New password
   * @returns Message indicating password was reset successfully
   */
  async resetPassword(email: string, password: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if user is not a local user (cannot reset password for social login users)
    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException(
        `${
          user.provider.charAt(0).toUpperCase() + user.provider.slice(1)
        } users cannot reset password. Please use ${user.provider} login.`
      );
    }

    // Update user's password
    await this.usersService.updatePassword(email, password);

    return {
      message: "Password reset successful",
    };
  }

  /**
   * Initiate find username by sending OTP
   * @param email Email address to find username for
   * @returns Message indicating find username email was sent
   */
  async initiateFindUsername(email: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.username) {
      throw new NotFoundException("Username not found for this email address.");
    }

    // Check if OTP already exists for this email
    const existingOtp = await this.valkeyService.getOtp(
      email,
      OtpType.FIND_USERNAME
    );
    if (existingOtp) {
      throw new BadRequestException(
        "OTP already sent to this email address. Please check your inbox or try again after 5 minutes."
      );
    }
    const otp = this.generateOtp();

    // Store OTP in Valkey (with 5 minutes TTL as configured in ValkeyService)
    await this.valkeyService.storeOtp(
      email,
      otp,
      OtpType.FIND_USERNAME,
      5 * 60
    );

    // Send OTP via email
    await this.mailerService.sendFindUsernameOtpEmail(email, otp);

    return {
      message: "Find username email sent",
    };
  }

  /**
   * Verify OTP and return username
   * @param email Email address to find username for
   * @param otp One-time password
   * @returns Username associated with the email
   */
  async verifyFindUsernameOtp(email: string, otp: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.username) {
      throw new NotFoundException("Username not found for this email address.");
    }

    // Get stored OTP from Valkey
    const storedOtpData = await this.valkeyService.getOtp(
      email,
      OtpType.FIND_USERNAME
    );

    if (!storedOtpData) {
      throw new BadRequestException("OTP expired or not found");
    }

    // Check if OTP matches
    if (storedOtpData.otp !== otp) {
      throw new BadRequestException("Invalid OTP");
    }

    return {
      message: "Username found successfully",
      verified: true,
      username: user.username,
    };
  }

  /**
   * Remove user account
   * @param userId User's ID
   * @returns Message indicating account was removed successfully
   */
  async removeAccount(userId: string) {
    // Call the UsersService to remove the account
    const success = await this.usersService.removeAccount(userId);

    if (success) {
      return {
        success: true,
        message: "Account removed successfully",
      };
    }
  }

  // ==================== PHONE VERIFICATION METHODS ====================

  /**
   * Initiate phone verification process
   */
  async initiatePhoneVerification(
    userId: string,
    dto: InitiatePhoneVerificationDto
  ): Promise<PhoneVerificationResponseDto> {
    try {
      // 1. Validate residence registration number
      const residenceValidation = ResidenceRegistrationValidator.validate(
        dto.residencePrefix,
        dto.residenceSuffix
      );

      if (!residenceValidation.valid) {
        throw new BadRequestException(residenceValidation.message);
      }

      // 2. Check rate limiting
      await this.checkPhoneVerificationRateLimit(userId, dto.phoneNumber);

      // 3. Combine and hash residence number
      const fullResidenceNumber = dto.residencePrefix + dto.residenceSuffix;
      const hashedResidence = await this.hashResidenceNumber(fullResidenceNumber);

      // 4. Check uniqueness
      await this.checkPhoneUniqueness(userId, dto.phoneNumber, hashedResidence);

      // 5. Clean up expired sessions
      await this.cleanupExpiredPhoneSessions();

      // 6. Generate OTP and create session
      const otp = this.smsService.generateOtp();
      const hashedOtp = await bcrypt.hash(otp, 10);

      const session = await this.createPhoneVerificationSession({
        userId,
        phoneNumber: dto.phoneNumber,
        phoneCarrier: dto.phoneCarrier,
        residencePrefix: dto.residencePrefix,
        residenceNumberHash: hashedResidence,
        username: dto.username,
        hashedOtp
      });

      // 7. Send SMS
      const smsResult = await this.smsService.sendOtp(
        dto.phoneNumber,
        otp,
        dto.phoneCarrier
      );

      if (!smsResult) {
        // Clean up session if SMS failed
        await this.sessionRepository.delete(session.id);
        throw new BadRequestException('Không thể gửi SMS. Vui lòng thử lại sau.');
      }

      // 8. Log success (without sensitive data)
      this.logSecurePhoneOperation('Phone verification initiated', {
        userId,
        phoneNumber: this.maskPhoneNumber(dto.phoneNumber),
        phoneCarrier: dto.phoneCarrier,
        sessionId: session.id
      });

      return {
        success: true,
        message: 'OTP đã được gửi đến số điện thoại',
        sessionId: session.id,
        expiresAt: session.expiresAt,
        maskedPhone: this.maskPhoneNumber(dto.phoneNumber)
      };

    } catch (error) {
      this.logger.error(`Phone verification initiation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify OTP and complete phone verification
   */
  async verifyPhoneOtp(
    userId: string,
    dto: VerifyPhoneOtpDto
  ): Promise<PhoneVerificationResponseDto> {
    try {
      // 1. Find and validate session
      const session = await this.sessionRepository.findOne({
        where: {
          id: dto.sessionId,
          userId
        }
      });

      if (!session) {
        throw new NotFoundException('Phiên xác thực không tồn tại hoặc đã hết hạn');
      }

      // 2. Check expiration
      if (new Date() > session.expiresAt) {
        await this.sessionRepository.delete(session.id);
        throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
      }

      // 3. Check attempts
      if (session.attempts >= this.MAX_ATTEMPTS) {
        await this.sessionRepository.delete(session.id);
        throw new BadRequestException('Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.');
      }

      // 4. Verify OTP
      const isOtpValid = await bcrypt.compare(dto.otp, session.otp);

      if (!isOtpValid) {
        // Increment attempts
        await this.sessionRepository.update(session.id, {
          attempts: session.attempts + 1
        });

        const remainingAttempts = this.MAX_ATTEMPTS - session.attempts - 1;
        throw new BadRequestException(
          `Mã OTP không chính xác. Còn lại ${remainingAttempts} lần thử.`
        );
      }

      // 5. Update user with verified phone info
      await this.updateUserPhoneInfo(userId, session);

      // 6. Clean up session
      await this.sessionRepository.delete(session.id);

      // 7. Log success
      this.logSecurePhoneOperation('Phone verification completed', {
        userId,
        phoneNumber: this.maskPhoneNumber(session.phoneNumber),
        phoneCarrier: session.phoneCarrier
      });

      return {
        success: true,
        message: 'Xác thực số điện thoại thành công'
      };

    } catch (error) {
      this.logger.error(`Phone OTP verification failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get phone verification status for user
   */
  async getPhoneVerificationStatus(userId: string): Promise<PhoneVerificationStatusDto> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return {
      phoneVerified: user.phoneVerified || false,
      phoneNumber: user.phoneNumber,
      phoneCarrier: user.phoneCarrier,
      identityVerified: user.identityVerified || false,
      phoneVerifiedAt: user.phoneVerifiedAt
    };
  }

  // ==================== PHONE VERIFICATION HELPER METHODS ====================

  /**
   * Check rate limiting for phone verification
   */
  private async checkPhoneVerificationRateLimit(userId: string, phoneNumber: string): Promise<void> {
    const rateLimitKey = `phone_verify_rate:${userId}:${phoneNumber}`;
    const attempts = await this.valkeyService.get(rateLimitKey);

    if (attempts && parseInt(attempts) >= 3) {
      throw new BadRequestException(
        `Đã vượt quá giới hạn yêu cầu. Vui lòng thử lại sau ${this.RATE_LIMIT_MINUTES} phút.`
      );
    }

    // Increment attempts
    const currentAttempts = attempts ? parseInt(attempts) + 1 : 1;
    await this.valkeyService.setex(
      rateLimitKey,
      this.RATE_LIMIT_MINUTES * 60,
      currentAttempts.toString()
    );
  }

  /**
   * Check phone number and residence number uniqueness
   */
  private async checkPhoneUniqueness(
    userId: string,
    phoneNumber: string,
    hashedResidence: string
  ): Promise<void> {
    // Check phone number uniqueness
    const existingPhoneUser = await this.usersService.findByPhoneNumber(phoneNumber);

    if (existingPhoneUser && existingPhoneUser.id !== userId) {
      throw new ConflictException('Số điện thoại đã được sử dụng bởi người dùng khác');
    }

    // Check residence number uniqueness
    const existingResidenceUser = await this.usersService.findByResidenceNumber(hashedResidence);

    if (existingResidenceUser && existingResidenceUser.id !== userId) {
      throw new ConflictException('Số đăng ký cư trú đã được sử dụng bởi người dùng khác');
    }
  }

  /**
   * Create verification session
   */
  private async createPhoneVerificationSession(data: {
    userId: string;
    phoneNumber: string;
    phoneCarrier: string;
    residencePrefix: string;
    residenceNumberHash: string;
    username: string;
    hashedOtp: string;
  }): Promise<PhoneVerificationSession> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    const session = this.sessionRepository.create({
      userId: data.userId,
      phoneNumber: data.phoneNumber,
      otp: data.hashedOtp,
      expiresAt,
      attempts: 0,
      residenceNumberHash: data.residenceNumberHash,
      residencePrefix: data.residencePrefix,
      phoneCarrier: data.phoneCarrier,
      username: data.username
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Update user with verified phone information
   */
  private async updateUserPhoneInfo(
    userId: string,
    session: PhoneVerificationSession
  ): Promise<void> {
    await this.usersService.updatePhoneVerification(userId, {
      phoneNumber: session.phoneNumber,
      phoneCarrier: session.phoneCarrier,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
      residenceRegistrationNumber: session.residenceNumberHash,
      residenceRegistrationPrefix: session.residencePrefix,
      identityVerified: true
    });
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredPhoneSessions(): Promise<void> {
    try {
      const result = await this.sessionRepository.delete({
        expiresAt: LessThan(new Date())
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} expired phone verification sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error.stack);
    }
  }

  /**
   * Hash residence registration number
   */
  private async hashResidenceNumber(number: string): Promise<string> {
    return bcrypt.hash(number, 10);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 8) return phone;

    const start = phone.substring(0, phone.length - 8);
    const end = phone.substring(phone.length - 4);
    return `${start}****${end}`;
  }

  /**
   * Log operations without sensitive data
   */
  private logSecurePhoneOperation(operation: string, data: any): void {
    const sanitizedData = {
      ...data,
      residenceSuffix: '****masked****',
      residenceNumberHash: '****masked****',
      otp: '****masked****'
    };
    this.logger.log(`${operation}:`, sanitizedData);
  }
}
