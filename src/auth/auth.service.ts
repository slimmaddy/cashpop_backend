import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { ValkeyService, OtpType } from "../services/valkey.service";
import { MailerService } from "../services/mailer.service";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private valkeyService: ValkeyService,
    private mailerService: MailerService,
    private tokenService: TokenService
  ) {}

  private generateOtp() {
    // Generate a random 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username);
    if (user && (await user.validatePassword(password))) {
      const { password, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async validateRefreshToken(username: string, refreshToken: string): Promise<any> {
      const user = await this.usersService.findByUsername(username);
      if (user && (await user.validateRefreshToken(refreshToken))) {
          const { password, refreshToken, ...result } = user;
          return result;
      }
      return null;
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
      const existingUser = await this.usersService.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException("Email already exists");
      }

      // Create the user
      const refreshToken = this.tokenService.generateRefreshToken();
      const user = await this.usersService.create({
        email: createUserDto.email,
        username: createUserDto.username,
        password: createUserDto.password,
        refreshToken,
      });

      // Generate tokens
      const accessToken = await this.tokenService.generateAccessToken(user.id);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
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

  // The validateFacebookToken method has been removed as it's now handled by the FacebookStrategy

  async facebookLogin(email: string, facebookId: string) {
    let user = await this.usersService.findByEmail(email);

    if (user) {
      // If user exists but is not a Facebook user, return error
      if (!user.isFacebookUser) {
        throw new ConflictException(
          "Email already registered with a different method"
        );
      }
    } else {
      // Create new user if not exists
      user = await this.usersService.createFacebookUser(email, facebookId);
    }

    const tokens = await this.tokenService.generateAuthTokens(user.id);

    // Store the hashed refresh token in the database
    await this.usersService.setRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      ...tokens,
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

    // Check if user is a Facebook user
    if (user.isFacebookUser) {
      throw new BadRequestException("Facebook users cannot reset password. Please use Facebook login.");
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

    // Check if user is a Facebook user
    if (user.isFacebookUser) {
      throw new BadRequestException("Facebook users cannot reset password. Please use Facebook login.");
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

}
