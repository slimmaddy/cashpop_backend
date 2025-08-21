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
  async generateAuthTokens(userId: string, email?: string, role?: string) {
    // Generate access token using JWT
    const accessToken = await this.generateAccessToken(userId,email,role);

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
  async generateAccessToken(userId: string, email?:string, role?:string): Promise<string> {
    const payload: any = {sub:userId};
    if(email) payload.email = email;
    if(role) payload.role = role;
    return this.jwtService.signAsync(payload,
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
