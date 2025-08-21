import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class ResetPasswordVerifyOtpDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description: "One-time password sent to the email",
    example: "123456",
  })
  @IsString({ message: "OTP must be a string" })
  @IsNotEmpty({ message: "OTP is required" })
  @Length(4, 4, { message: "OTP must be 4 characters long" })
  otp: string;
}

export class ResetPasswordVerifyOtpResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "OTP verified successfully",
  })
  message: string;

  @ApiProperty({
    description: "Verification status",
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: "JWT token for password reset",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  token: string;
}
