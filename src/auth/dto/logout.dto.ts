import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class LogoutDto {
  @ApiProperty({
    description: "The unique identifier of the user",
    example: "5f9d5a5b9c9d5a5b9c9d5a5b",
  })
  @IsUUID()
  @IsNotEmpty({ message: "User ID is required" })
  userId: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: "Status message",
    example: "Logout successful",
  })
  message: string;
}
