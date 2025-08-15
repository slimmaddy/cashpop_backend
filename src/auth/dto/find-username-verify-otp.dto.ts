import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class FindUsernameVerifyOtpDto {
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

export class FindUsernameVerifyOtpResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Username found successfully",
  })
  message: string;

  @ApiProperty({
    description: "Verification status",
    example: true,
  })
  verified: boolean;

  @ApiProperty({
    description: "Username associated with the email",
    example: "johndoe",
  })
  username: string;
}
