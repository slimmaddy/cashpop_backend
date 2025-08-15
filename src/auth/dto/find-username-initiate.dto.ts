import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class FindUsernameInitiateDto {
  @ApiProperty({
    description: "Email address of the user",
    example: "user@example.com",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;
}

export class FindUsernameInitiateResponseDto {
  @ApiProperty({
    description: "Response message",
    example: "Find username email sent",
  })
  message: string;
}
