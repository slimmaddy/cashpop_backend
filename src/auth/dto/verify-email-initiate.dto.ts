import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyEmailInitiateDto {
  @ApiProperty({
    description: "Email address to verify",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;
}

export class VerifyEmailInitiateResponseDto {
  @ApiProperty({
    description: "Status message",
    example: "Verification email sent",
  })
  message: string;
}
