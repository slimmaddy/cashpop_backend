import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsDateString,
} from "class-validator";

export class CreateHealthDataDto {
  @ApiProperty({
    description: "The nonce value that was used for attestation",
    example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Nonce is required" })
  nonce: string;

  @ApiProperty({
    description:
      "The attestation token from Play Integrity API (Android) or assertion from App Attest (iOS)",
    example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ...",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Attestation token is required" })
  attestationToken: string;

  @ApiProperty({
    description: "The source platform of the attestation (android or ios)",
    example: "android",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Platform is required" })
  platform: string;
  @ApiProperty({
    description: "Number of steps taken",
    example: 8500,
    required: true,
  })
  @IsNumber()
  @Min(0, { message: "Steps must be a positive number" })
  @IsNotEmpty({ message: "Steps is required" })
  steps: number;

  @ApiProperty({
    description: "Total duration of activity in seconds",
    example: 3600,
    required: true,
  })
  @IsNumber()
  @Min(0, { message: "Duration must be a positive number" })
  @IsNotEmpty({ message: "Duration is required" })
  duration: number;

  @ApiProperty({
    description: "Total calories burned",
    example: 350.5,
    required: true,
  })
  @IsNumber()
  @Min(0, { message: "Calories must be a positive number" })
  @IsNotEmpty({ message: "Calories is required" })
  calories: number;

  @ApiProperty({
    description: "Total distance covered in meters",
    example: 5200.75,
    required: true,
  })
  @IsNumber()
  @Min(0, { message: "Distance must be a positive number" })
  @IsNotEmpty({ message: "Distance is required" })
  distance: number;

  @ApiProperty({
    description: "Source of the health data",
    example: "ios_health",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Source is required" })
  source: string;

  @ApiProperty({
    description: "The date of the health data (YYYY-MM-DD)",
    example: "2025-07-24",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  date?: string;
}
