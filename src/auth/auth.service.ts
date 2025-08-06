import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import {UsersService} from "../users/users.service";
import {CreateUserDto} from "../users/dto/create-user.dto";
import {AuthProvider} from "../users/entities/user.entity";
import {OtpType, ValkeyService} from "../services/valkey.service";
import {MailerService} from "../services/mailer.service";
import {TokenService} from "./token.service";

@Injectable()
export class AuthService {

  private readonly logger = new Logger(AuthService.name)

  constructor(
      private usersService: UsersService,
      private valkeyService: ValkeyService,
      private mailerService: MailerService,
      private tokenService: TokenService,
      private configService: ConfigService
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
  async validateRefreshToken(username: string, refreshToken: string): Promise<{ user: any, status: string } | null> {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;

    // Get refresh token expiration time from ConfigService
    const refreshExpSec = this.configService.get<number>('REFRESH_TOKEN_EXPIRATION_IN_SEC', 604800);

    // Pass the expiration time to the User entity's validateRefreshToken method
    const validationResult = await user.validateRefreshToken(refreshToken, refreshExpSec);

    if (validationResult.isValid) {
      const { password, refreshToken, ...result } = user;
      return { user: result, status: 'valid' };
    }

    // Return the validation status even if the token is invalid
    return { user: null, status: validationResult.status };
  }

  async login(user: any) {
    const tokens = await this.tokenService.generateAuthTokens(user.id);
    // Store the hashed refresh token in the database
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Sign in or create a new Google user
   * @param email User email from Google
   * @param googleId User's Google ID
   * @returns Object containing user information and token
   */
  async googleLogin(email: string, googleId: string) {

    this.logger.log(`Incoming Google OAuth Request: ====> { Email: ${email}, Apple: ${googleId} }`);

    // Check email
    if (!email) {
      throw new UnauthorizedException(
          "Google authentication failed: No email provided"
      );
    }

    let user = await this.usersService.findByEmail(email)
    // Check for existing user in DB
    if (!user) {
      user = await this.usersService.createGoogleUser(email, googleId)
    } else {
      if (user.provider !== AuthProvider.GOOGLE ) {
        throw new ConflictException(
            "Email google already registered with a different method"
        );
      }
    }

    const token = await this.tokenService.generateAuthTokens(user.id);
    this.logger.log(`Generated auth tokens for user ID: ${user.id}. Token details: ${JSON.stringify(token)}`);

    // Stores the refresh token in the database.
    await this.usersService.setRefreshToken(user.id, token.refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...token,
    };
  }

  /**
   * Sign in or create a new Apple user
   * @param email User email from Apple
   * @param appleId User's Apple ID
   * @returns Object containing user information and token
   */
  async appleLogin(email: string, appleId: string) {
    this.logger.log(`Incoming Apple OAuth Request: ====> { Email: ${email}, Apple: ${appleId} }`);

    // check mail
    if (!email) {
      throw new UnauthorizedException(
          "Apple authentication failed: No email provided"
      );
    }

    // Check user by email, create new if not exist, or error if email used another method
    let user = await this.usersService.findByEmail(email)
    if (!user) {
      user = await this.usersService.createAppleUser(email, appleId)
      this.logger.log(`Created new Apple user with email: ${email} and Apple ID: ${appleId}`);
    } else {
      if (user.provider !== AuthProvider.APPLE ) {
        throw new ConflictException(
            "Email apple already registered with a different method"
        );
      }
    }

    // Create access token and refresh token for user based on user.id
    const token = await this.tokenService.generateAuthTokens(user.id);
    this.logger.log(`Authentication code after creation : ====> ${token}`)

    // Save refresh token to database for future token refresh
    await this.usersService.setRefreshToken(user.id, token.refreshToken)

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
      ...token,
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
      const existingUser = await this.usersService.findByEmail(createUserDto.email);
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
      const accessToken = await this.tokenService.generateAccessToken(user.id);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
        refreshToken,
        accessToken,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Registration failed");
    }
  }

  async refreshTokens(user: any) {
    // Generate new tokens
    const accessToken = await this.tokenService.generateAccessToken(user.id);
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
      user = await this.usersService.createFacebookUser(email, providerId, name);
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id);

    // Store the hashed refresh token in the databasededdreer
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    };
  }

  async lineLogin(email: string, providerId: string, name: string) {
    // For Line users, find by providerId first since email might be placeholder
    let user = await this.usersService.findByProviderId(providerId, AuthProvider.LINE);

    if (!user && !email.includes('line.placeholder')) {
      // If not found by providerId and email is not placeholder, try finding by email
      user = await this.usersService.findByEmail(email);
    }

    if (user) {
      // If user exists but is not a Line user, return error
      if (user.provider !== AuthProvider.LINE) {
        throw new ConflictException(
          "Account already registered with a different method"
        );
      }
      
      // If found by email but different providerId, update the providerId
      if (user.providerId !== providerId) {
        await this.usersService.updateProviderId(user.id, providerId);
        user.providerId = providerId;
      }
    } else {
      // Create new user if not exists
      user = await this.usersService.createLineUser(email, providerId, name);
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id);

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
    const existingOtp = await this.valkeyService.getOtp(email, OtpType.REGISTRATION);
    if (existingOtp) {
      throw new BadRequestException("OTP already sent to this email address. Please check your inbox or try again after 5 minutes.");
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
    const storedOtpData = await this.valkeyService.getOtp(email, OtpType.REGISTRATION);

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
      throw new BadRequestException(`${user.provider.charAt(0).toUpperCase() + user.provider.slice(1)} users cannot reset password. Please use ${user.provider} login.`);
    }

    // Check if OTP already exists for this email
    const existingOtp = await this.valkeyService.getOtp(email, OtpType.PASSWORD_RESET);
    if (existingOtp) {
      throw new BadRequestException("OTP already sent to this email address. Please check your inbox or try again after 5 minutes.");
    }

    const otp = this.generateOtp()

    // Store OTP in Valkey (with 5 minutes TTL as configured in ValkeyService)
    await this.valkeyService.storeOtp(email, otp, OtpType.PASSWORD_RESET, 5 * 60);

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
    const storedOtpData = await this.valkeyService.getOtp(email, OtpType.PASSWORD_RESET);

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
      throw new BadRequestException(`${user.provider.charAt(0).toUpperCase() + user.provider.slice(1)} users cannot reset password. Please use ${user.provider} login.`);
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
    const existingOtp = await this.valkeyService.getOtp(email, OtpType.FIND_USERNAME);
    if (existingOtp) {
      throw new BadRequestException("OTP already sent to this email address. Please check your inbox or try again after 5 minutes.");
    }
    const otp = this.generateOtp();

    // Store OTP in Valkey (with 5 minutes TTL as configured in ValkeyService)
    await this.valkeyService.storeOtp(email, otp, OtpType.FIND_USERNAME, 5 * 60);

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
    const storedOtpData = await this.valkeyService.getOtp(email, OtpType.FIND_USERNAME);

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
        message: "Account removed successfully"
      };
    }
  }
}