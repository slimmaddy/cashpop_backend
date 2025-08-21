import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
  @ApiProperty({
    description: "The unique identifier of the user",
    example: "5f9d5a5b9c9d5a5b9c9d5a5b",
  })
  id: string;

  @ApiProperty({
    description: "The username of the user",
    example: "johndoe",
  })
  username: string;

  @ApiProperty({
    description: "The full name of the user",
    example: "John Doe",
  })
  name: string;

  @ApiProperty({
    description: "The email address of the user",
    example: "user@example.com",
  })
  email: string;
}
