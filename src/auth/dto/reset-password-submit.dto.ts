import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsEmail,
} from "class-validator";

export class ResetPasswordSubmitDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description: "New password",
    example: "StrongP@ssw0rd",
  })
  @IsString({ message: "Password must be a string" })
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character",
  })
  password: string;

  @ApiProperty({
    description: "JWT token from email verification",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty({ message: "Verification token is required" })
  token: string;
}

export class ResetPasswordSubmitResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Password reset successful",
  })
  message: string;
}
