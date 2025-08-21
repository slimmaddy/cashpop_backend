import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsDateString } from "class-validator";

export enum StatisticsPeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
}

export class HealthStatisticsQueryDto {
  @ApiProperty({
    description: "Start date for statistics (YYYY-MM-DD)",
    example: "2025-07-01",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: "End date for statistics (YYYY-MM-DD)",
    example: "2025-07-24",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: "Period for aggregating statistics",
    enum: StatisticsPeriod,
    example: StatisticsPeriod.WEEK,
    required: false,
  })
  @IsEnum(StatisticsPeriod)
  @IsOptional()
  period?: StatisticsPeriod = StatisticsPeriod.DAY;
}

export class HealthStatisticsItemDto {
  @ApiProperty({
    description: "Date or period label",
    example: "2025-07-24",
  })
  date: string;

  @ApiProperty({
    description: "Total steps for the period",
    example: 8500,
  })
  steps: number;

  @ApiProperty({
    description: "Total duration in seconds for the period",
    example: 3600,
  })
  duration: number;

  @ApiProperty({
    description: "Total calories burned for the period",
    example: 350.5,
  })
  calories: number;

  @ApiProperty({
    description: "Total distance in meters for the period",
    example: 5200.75,
  })
  distance: number;
}

export class HealthStatisticsResponseDto {
  @ApiProperty({
    description: "Array of statistics items",
    type: [HealthStatisticsItemDto],
  })
  items: HealthStatisticsItemDto[];

  @ApiProperty({
    description: "Summary statistics for the entire period",
    type: HealthStatisticsItemDto,
  })
  summary: HealthStatisticsItemDto;
}
