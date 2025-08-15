import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { CreateUserDto } from "../../users/dto/create-user.dto";

export class RegisterDto extends CreateUserDto {
  @ApiProperty({
    description: "JWT token from email verification",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty({ message: "Verification token is required" })
  token: string;
}
