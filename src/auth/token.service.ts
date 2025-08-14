import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService
  ) {}

  /**
   * Generate access and refresh tokens for a user
   * @param userId User ID
   * @returns Object containing access and refresh tokens
   */
  async generateAuthTokens(userId: string) {
    // Generate access token using JWT
    const accessToken = await this.generateAccessToken(userId);

    // Generate a random refresh token
    const refreshToken = this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate JWT access token for a user
   * @param userId User ID
   * @returns JWT access token
   */
  async generateAccessToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get("JWT_SECRET"),
        expiresIn: this.configService.get("JWT_EXPIRATION", "15m"),
      }
    );
  }

  /**
   * Generate a random refresh token
   * @returns Random string to be used as refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }

  /**
   * Generate a short-lived JWT token for email verification
   * @param email User's email
   * @returns JWT token
   */
  async generateEmailVerificationToken(email: string) {
    return this.jwtService.signAsync(
      { email },
      {
        secret: this.configService.get("JWT_SECRET"),
        expiresIn: "15m", // Short-lived token for email verification
      }
    );
  }
}
