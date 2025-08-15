import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({
    description: "The username of the user",
    example: "johndoe",
  })
  @IsString()
  @IsNotEmpty({ message: "Username is required" })
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  username: string;

  @ApiProperty({
    description: "The full name of the user",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  name: string;

  @ApiProperty({
    description: "The email address of the user",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @ApiProperty({
    description: "The password for the user account",
    example: "StrongPassword123!",
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @ApiProperty({
    description: "The invite code used during registration (optional)",
    example: "abc123",
    required: false,
  })
  @IsString()
  invitedCode?: string;

  refreshToken: string;

  refreshTokenCreatedAt: Date;
}
