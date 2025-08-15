import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export enum OtpType {
  REGISTRATION = "registration",
  PASSWORD_RESET = "password_reset",
  FIND_USERNAME = "find_username",
}

@Injectable()
export class ValkeyService {
  private readonly client: Redis;
  private readonly defaultOtpExpiry: number = 5 * 60; // 5 minutes in seconds
  private readonly defaultNonceExpiry: number = 5 * 60; // 5 minutes in seconds

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      host: this.configService.get("VALKEY_HOST", "localhost"),
      port: this.configService.get("VALKEY_PORT", 6379),
      password: this.configService.get("VALKEY_PASSWORD", ""),
      db: this.configService.get("VALKEY_DB", 0),
    });
  }

  /**
   * Store OTP for email verification or password reset
   * @param email User's email
   * @param otp One-time password
   * @param type Type of OTP (registration or password reset)
   * @param otpExpiry Expiry time
   */
  async storeOtp(
    email: string,
    otp: string,
    type: OtpType = OtpType.REGISTRATION,
    otpExpiry = this.defaultOtpExpiry
  ): Promise<void> {
    const key = this.getOtpKey(email, type);
    const value = JSON.stringify({
      otp,
      timestamp: Date.now(),
    });
    await this.client.set(key, value, "EX", otpExpiry);
  }

  /**
   * Get stored OTP for email
   * @param email User's email
   * @param type Type of OTP (registration or password reset)
   * @returns OTP data or null if not found
   */
  async getOtp(
    email: string,
    type: OtpType = OtpType.REGISTRATION
  ): Promise<{ otp: string; timestamp: number } | null> {
    const key = this.getOtpKey(email, type);
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  }

  /**
   * Generate OTP key for email
   * @param email User's email
   * @param type Type of OTP (registration or password reset)
   * @returns OTP key
   */
  private getOtpKey(
    email: string,
    type: OtpType = OtpType.REGISTRATION
  ): string {
    return `otp:${type}:${email}`;
  }

  /**
   * Store attestation nonce for a user
   * @param userId User's ID
   * @param nonce Attestation nonce value
   * @param expiryInSeconds Expiry time in seconds (default: 5 minutes)
   * @returns Expiration date
   */
  async storeAttestationNonce(
    userId: string,
    nonce: string,
    expiryInSeconds = this.defaultNonceExpiry
  ): Promise<Date> {
    const key = this.getAttestationNonceKey(userId, nonce);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiryInSeconds);

    const value = JSON.stringify({
      userId,
      nonce,
      expiresAt: expiresAt.toISOString(),
      used: false,
    });

    await this.client.set(key, value, "EX", expiryInSeconds);
    return expiresAt;
  }

  /**
   * Validate and mark an attestation nonce as used
   * @param userId User's ID
   * @param nonce Attestation nonce value
   * @returns Object with isValid flag and nonceData if found
   */
  async validateAndUseAttestationNonce(
    userId: string,
    nonce: string
  ): Promise<{
    isValid: boolean;
    nonceData?: {
      userId: string;
      nonce: string;
      expiresAt: string;
      used: boolean;
    };
  }> {
    const key = this.getAttestationNonceKey(userId, nonce);
    const value = await this.client.get(key);

    if (!value) {
      return { isValid: false }; // Nonce not found
    }

    const nonceData = JSON.parse(value);

    // Check if nonce is already used
    if (nonceData.used) {
      return { isValid: false, nonceData };
    }

    // Check if nonce is expired
    const expiresAt = new Date(nonceData.expiresAt);
    const now = new Date();
    if (now > expiresAt) {
      return { isValid: false, nonceData };
    }

    // Mark nonce as used
    nonceData.used = true;
    await this.client.set(key, JSON.stringify(nonceData), "KEEPTTL");

    return { isValid: true, nonceData };
  }

  /**
   * Generate attestation nonce key
   * @param userId User's ID
   * @param nonce Attestation nonce value
   * @returns Attestation nonce key
   */
  private getAttestationNonceKey(userId: string, nonce: string): string {
    return `attestation:nonce:${userId}:${nonce}`;
  }

  /**
   * Generic get method for any key
   * @param key Redis key
   * @returns Value or null if not found
   */
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Generic set method with expiry
   * @param key Redis key
   * @param expiry Expiry time in seconds
   * @param value Value to store
   */
  async setex(key: string, expiry: number, value: string): Promise<void> {
    await this.client.setex(key, expiry, value);
  }

  /**
   * Generic set method
   * @param key Redis key
   * @param value Value to store
   */
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /**
   * Delete a key
   * @param key Redis key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
