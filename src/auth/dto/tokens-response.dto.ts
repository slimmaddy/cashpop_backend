import { ApiProperty } from "@nestjs/swagger";

export class TokensResponseDto {
  @ApiProperty({
    description: "JWT access token for authentication",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;
}
