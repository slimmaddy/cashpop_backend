import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailOtpDto {
  @ApiProperty({
    description: "Email address to verify",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description: "One-time password (OTP) for verification",
    example: "123456",
  })
  @IsString({ message: "OTP must be a string" })
  @IsNotEmpty({ message: "OTP is required" })
  @Length(4, 4, { message: "OTP must be 4 characters long" })
  otp: string;
}

export class VerifyEmailOtpResponseDto {
  @ApiProperty({
    description: "Status message",
    example: "Email verified successfully",
  })
  message: string;

  @ApiProperty({
    description: "Whether the email was verified",
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: "JWT token for email verification",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  token: string;
}
