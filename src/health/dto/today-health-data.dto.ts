import { ApiProperty } from "@nestjs/swagger";

export class TodayHealthDataDto {
  @ApiProperty({
    description: "Today's date (YYYY-MM-DD)",
    example: "2025-07-24",
  })
  date: string;

  @ApiProperty({
    description: "Total steps taken today",
    example: 8500,
  })
  steps: number;

  @ApiProperty({
    description: "Total duration of activity in seconds today",
    example: 3600,
  })
  duration: number;

  @ApiProperty({
    description: "Total calories burned today",
    example: 350.5,
  })
  calories: number;

  @ApiProperty({
    description: "Total distance covered in meters today",
    example: 5200.75,
  })
  distance: number;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2025-07-24T21:45:30Z",
  })
  lastUpdated: Date;
}
