import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class ResetPasswordInitiateDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;
}

export class ResetPasswordInitiateResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Password reset email sent",
  })
  message: string;
}
