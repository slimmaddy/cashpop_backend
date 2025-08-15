import { ApiProperty } from "@nestjs/swagger";

export class HealthCheckResponseDto {
  @ApiProperty({
    description: "Health status message",
    example: "CashPop API is running!",
  })
  message: string;
}
