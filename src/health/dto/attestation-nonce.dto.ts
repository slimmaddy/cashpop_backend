import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AttestationNonceResponseDto {
  @ApiProperty({
    description: "The nonce value to be used for attestation",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  })
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @ApiProperty({
    description: "The expiration time of the nonce in ISO format",
    example: "2025-07-25T00:29:30.000Z",
  })
  @IsString()
  @IsNotEmpty()
  expiresAt: string;
}

export class VerifyAttestationDto {
  @ApiProperty({
    description: "The nonce value that was used for attestation",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  })
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @ApiProperty({
    description:
      "The attestation token from Play Integrity API (Android) or assertion from App Attest (iOS)",
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ...",
  })
  @IsString()
  @IsNotEmpty()
  attestationToken: string;

  @ApiProperty({
    description: "The source platform of the attestation (android or ios)",
    example: "android",
  })
  @IsString()
  @IsNotEmpty()
  platform: string;
}
