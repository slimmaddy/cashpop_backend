import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Delete,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshGuard } from "./guards/refresh.guard";
import { FacebookAuthGuard } from "./guards/facebook-auth.guard";
import { EmailVerificationGuard } from "./guards/email-verification.guard";
import { FacebookAuthDto } from "./dto/facebook-auth.dto";
import { LineAuthDto } from "./dto/line-auth.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { UserProfileDto } from "./dto/user-profile.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import {
  VerifyEmailInitiateDto,
  VerifyEmailInitiateResponseDto,
} from "./dto/verify-email-initiate.dto";
import {
  VerifyEmailOtpDto,
  VerifyEmailOtpResponseDto,
} from "./dto/verify-email-otp.dto";
import {
  ResetPasswordInitiateDto,
  ResetPasswordInitiateResponseDto,
} from "./dto/reset-password-initiate.dto";
import {
  ResetPasswordVerifyOtpDto,
  ResetPasswordVerifyOtpResponseDto,
} from "./dto/reset-password-verify-otp.dto";
import {
  ResetPasswordSubmitDto,
  ResetPasswordSubmitResponseDto,
} from "./dto/reset-password-submit.dto";
import {
  FindUsernameInitiateDto,
  FindUsernameInitiateResponseDto,
} from "./dto/find-username-initiate.dto";
import {
  FindUsernameVerifyOtpDto,
  FindUsernameVerifyOtpResponseDto,
} from "./dto/find-username-verify-otp.dto";
import { LogoutResponseDto } from "./dto/logout.dto";
import { TokensResponseDto } from "./dto/tokens-response.dto";
import { LineAuthGuard } from "./guards/line-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("verify-email-initiate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initiate email verification by sending OTP" })
  @ApiResponse({
    status: 200,
    description: "Verification email sent",
    type: VerifyEmailInitiateResponseDto,
  })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async verifyEmailInitiate(
    @Body() verifyEmailInitiateDto: VerifyEmailInitiateDto
  ) {
    return this.authService.initiateEmailVerification(
      verifyEmailInitiateDto.email
    );
  }

  @Post("verify-email-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with OTP" })
  @ApiResponse({
    status: 200,
    description: "Email verified successfully",
    type: VerifyEmailOtpResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async verifyEmailOtp(@Body() verifyEmailOtpDto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailOtp(
      verifyEmailOtpDto.email,
      verifyEmailOtpDto.otp
    );
  }

  @UseGuards(EmailVerificationGuard)
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user with verified email token" })
  @ApiResponse({
    status: 201,
    description: "User successfully registered",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: "Email already exists" })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired verification token",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async login(@Body() loginDto: LoginDto, @Req() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout" })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
    type: LogoutResponseDto,
  })
  async logout(@Req() req) {
    return this.authService.logout(req.user);
  }

  @UseGuards(RefreshGuard)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
    type: TokensResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto, @Req() req) {
    return this.authService.refreshTokens(req.user);
  }

  @UseGuards(FacebookAuthGuard)
  @Post("facebook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with Facebook token" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 409,
    description: "Email already registered with a different method",
  })
  async facebookLogin(@Body() facebookAuthDto: FacebookAuthDto, @Req() req) {
    const { email, facebookId, name } = req.user;
    return this.authService.facebookLogin(email, facebookId, name);
  }

  @UseGuards(LineAuthGuard)
  @Post("line")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with Line token" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 409,
    description: "Email already registered with a different method",
  })
  async lineLogin(@Body() lineAuthDto: LineAuthDto, @Req() req) {
    const { email, lineId, name } = req.user;
    return this.authService.lineLogin(email, lineId, name);
  }

  @Post("line/test")
  @ApiOperation({
    summary: "Test LINE access token",
    description:
      "Simple test to check what your LINE token returns and troubleshoot email issues",
  })
  @ApiResponse({
    status: 200,
    description: "Test results with recommendations",
  })
  async testLineToken(@Body() body: { access_token: string }) {
    const { access_token } = body;

    if (!access_token) {
      return {
        success: false,
        message: "access_token is required in request body",
      };
    }

    const axios = require("axios");
    const results = {
      success: true,
      profile: null,
      userinfo: null,
      tokenInfo: null,
      emailFound: false,
      recommendations: [],
    };

    try {
      // Test profile endpoint
      try {
        const profileResponse = await axios.get(
          "https://api.line.me/v2/profile",
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        results.profile = profileResponse.data;
      } catch (error) {
        results.profile = { error: error.response?.data || error.message };
      }

      // Test userinfo endpoint (this is where email should be)
      try {
        const userinfoResponse = await axios.get(
          "https://api.line.me/oauth2/v2.1/userinfo",
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        results.userinfo = userinfoResponse.data;
        if (userinfoResponse.data.email) {
          results.emailFound = true;
        }
      } catch (error) {
        results.userinfo = { error: error.response?.data || error.message };
        if (error.response?.status === 403) {
          results.recommendations.push(
            "❌ OpenID Connect not enabled - Enable it in LINE Developers Console"
          );
        }
      }

      // Test token verification
      try {
        const verifyResponse = await axios.post(
          "https://api.line.me/oauth2/v2.1/verify",
          `access_token=${access_token}`,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        results.tokenInfo = verifyResponse.data;

        if (!verifyResponse.data.scope?.includes("email")) {
          results.recommendations.push(
            '❌ Missing email scope - Re-authorize with "email" scope'
          );
        }
      } catch (error) {
        results.tokenInfo = { error: error.response?.data || error.message };
      }

      // Add recommendations based on results
      if (!results.emailFound) {
        results.recommendations.push("⚠️ No email found in any endpoint");
        results.recommendations.push(
          "🔧 Check: 1) OpenID Connect enabled, 2) Email scope granted, 3) User has email in LINE account"
        );
      } else {
        results.recommendations.push(
          "✅ Email found! LINE login should work now"
        );
      }

      return results;
    } catch (error) {
      return {
        success: false,
        message: "Test failed",
        error: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({
    status: 200,
    description: "Return the user profile",
    type: UserProfileDto,
  })
  getProfile(@Req() req): UserProfileDto {
    return req.user;
  }

  @Post("reset-password-initiate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initiate password reset by sending OTP" })
  @ApiResponse({
    status: 200,
    description: "Password reset email sent",
    type: ResetPasswordInitiateResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 400,
    description: "OTP already sent or Facebook user",
  })
  async resetPasswordInitiate(
    @Body() resetPasswordInitiateDto: ResetPasswordInitiateDto
  ) {
    return this.authService.initiatePasswordReset(
      resetPasswordInitiateDto.email
    );
  }

  @Post("reset-password-verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify password reset OTP" })
  @ApiResponse({
    status: 200,
    description: "OTP verified successfully",
    type: ResetPasswordVerifyOtpResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async resetPasswordVerifyOtp(
    @Body() resetPasswordVerifyOtpDto: ResetPasswordVerifyOtpDto
  ) {
    return this.authService.verifyPasswordResetOtp(
      resetPasswordVerifyOtpDto.email,
      resetPasswordVerifyOtpDto.otp
    );
  }

  @UseGuards(EmailVerificationGuard)
  @Post("reset-password-submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with verified email token" })
  @ApiResponse({
    status: 200,
    description: "Password reset successful",
    type: ResetPasswordSubmitResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({
    status: 400,
    description: "Facebook user cannot reset password",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid or expired verification token",
  })
  async resetPasswordSubmit(
    @Body() resetPasswordSubmitDto: ResetPasswordSubmitDto
  ) {
    return this.authService.resetPassword(
      resetPasswordSubmitDto.email,
      resetPasswordSubmitDto.password
    );
  }

  @Post("find-username-initiate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initiate find username by sending OTP" })
  @ApiResponse({
    status: 200,
    description: "Find username email sent",
    type: FindUsernameInitiateResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "OTP already sent" })
  async findUsernameInitiate(
    @Body() findUsernameInitiateDto: FindUsernameInitiateDto
  ) {
    return this.authService.initiateFindUsername(findUsernameInitiateDto.email);
  }

  @Post("find-username-verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and return username" })
  @ApiResponse({
    status: 200,
    description: "Username found successfully",
    type: FindUsernameVerifyOtpResponseDto,
  })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async findUsernameVerifyOtp(
    @Body() findUsernameVerifyOtpDto: FindUsernameVerifyOtpDto
  ) {
    return this.authService.verifyFindUsernameOtp(
      findUsernameVerifyOtpDto.email,
      findUsernameVerifyOtpDto.otp
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete("account")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove user account" })
  @ApiResponse({
    status: 200,
    description: "Account removed successfully",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true,
        },
        message: {
          type: "string",
          example: "Account removed successfully",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async removeAccount(@Req() req) {
    return this.authService.removeAccount(req.user.userId);
  }
}
