import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { ValkeyService } from "../services/valkey.service";
import { AttestationNonceResponseDto } from "./dto/attestation-nonce.dto";

@Injectable()
export class AttestationService {
  // Default nonce expiration time in minutes
  private readonly NONCE_EXPIRATION_MINUTES = 5;

  constructor(private valkeyService: ValkeyService) {}

  /**
   * Generate a new attestation nonce for a user
   */
  async generateNonce(userId: string): Promise<AttestationNonceResponseDto> {
    // Generate a random nonce
    const nonceValue = randomBytes(32).toString('hex');
    // Store the nonce in Valkey with expiration
    const expiryInSeconds = this.NONCE_EXPIRATION_MINUTES * 60;
    const expiresAt = await this.valkeyService.storeAttestationNonce(
      userId,
      nonceValue,
      expiryInSeconds
    );
    // Return the nonce and expiration time
    return {
      nonce: nonceValue,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validate a nonce and mark it as used
   */
  async validateAndUseNonce(
    userId: string,
    nonceValue: string
  ): Promise<boolean> {
    // Validate and mark the nonce as used in Valkey
    const { isValid, nonceData } =
      await this.valkeyService.validateAndUseAttestationNonce(
        userId,
        nonceValue
      );

    // Check if nonce exists, is not used, and is not expired
    if (!isValid) {
      if (!nonceData) {
        throw new BadRequestException("Invalid nonce");
      }

      if (nonceData.used) {
        throw new BadRequestException("Nonce has already been used");
      }

      const expiresAt = new Date(nonceData.expiresAt);
      const now = new Date();
      if (now > expiresAt) {
        throw new BadRequestException("Nonce has expired");
      }

      // If we get here, there was some other issue
      throw new BadRequestException("Failed to validate nonce");
    }

    return true;
  }

  /**
   * Verify Android attestation using Play Integrity API
   */
  async verifyAndroidAttestation(
    attestationToken: string,
    nonce: string
  ): Promise<boolean> {
    // In a real implementation, this would call the Play Integrity API to verify the token
    // For now, we'll just return true for demonstration purposes

    // TODO: Implement actual verification using Google Play Integrity API
    // https://developer.android.com/google/play/integrity/verdict

    console.log(
      `Verifying Android attestation with token: ${attestationToken.substring(
        0,
        20
      )}... and nonce: ${nonce}`
    );

    // Simulating verification
    return true;
  }

  /**
   * Verify iOS attestation using App Attest
   */
  async verifyIOSAttestation(
    attestationToken: string,
    nonce: string
  ): Promise<boolean> {
    // In a real implementation, this would call the App Attest API to verify the assertion
    // For now, we'll just return true for demonstration purposes

    // TODO: Implement actual verification using Apple's App Attest
    // https://developer.apple.com/documentation/devicecheck/validating_apps_that_connect_to_your_server

    console.log(
      `Verifying iOS attestation with token: ${attestationToken.substring(
        0,
        20
      )}... and nonce: ${nonce}`
    );

    // Simulating verification
    return true;
  }

  /**
   * Verify attestation based on platform
   */
  async verifyAttestation(
    platform: string,
    attestationToken: string,
    nonce: string
  ): Promise<boolean> {
    if (platform.toLowerCase() === "android") {
      return this.verifyAndroidAttestation(attestationToken, nonce);
    } else if (platform.toLowerCase() === "ios") {
      return this.verifyIOSAttestation(attestationToken, nonce);
    } else {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }
}
