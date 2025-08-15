import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual } from "typeorm";
import { HealthData } from "./entities/health-data.entity";
import { CreateHealthDataDto } from "./dto/create-health-data.dto";
import {
  HealthStatisticsQueryDto,
  HealthStatisticsResponseDto,
  HealthStatisticsItemDto,
  StatisticsPeriod,
} from "./dto/health-statistics.dto";
import { TodayHealthDataDto } from "./dto/today-health-data.dto";

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthData)
    private healthDataRepository: Repository<HealthData>
  ) {}

  /**
   * Create a new health data record
   */
  async create(
    userId: string,
    createHealthDataDto: CreateHealthDataDto
  ): Promise<HealthData> {
    // If date is not provided, use today's date
    const date =
      createHealthDataDto.date || new Date().toISOString().split("T")[0];

    // Check if a record for this user and date already exists
    const existingRecord = await this.healthDataRepository.findOne({
      where: {
        userId,
        date,
      },
    });

    if (existingRecord) {
      // Update existing record
      existingRecord.steps = createHealthDataDto.steps;
      existingRecord.duration = createHealthDataDto.duration;
      existingRecord.calories = createHealthDataDto.calories;
      existingRecord.distance = createHealthDataDto.distance;

      return this.healthDataRepository.save(existingRecord);
    }

    // Create a new record
    const healthData = this.healthDataRepository.create({
      userId,
      date,
      ...createHealthDataDto,
    });

    return this.healthDataRepository.save(healthData);
  }

  /**
   * Get health statistics for a user within a date range, aggregated by period
   */
  async getStatistics(
    userId: string,
    query: HealthStatisticsQueryDto
  ): Promise<HealthStatisticsResponseDto> {
    const today = new Date().toISOString().split("T")[0];
    const startDate = query.startDate || today;
    const endDate = query.endDate || today;
    const period = query.period || StatisticsPeriod.DAY;

    // Get all health data records for the user within the date range
    const records = await this.healthDataRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: {
        date: "ASC",
      },
    });

    if (records.length === 0) {
      throw new NotFoundException(
        "No health data found for the specified period"
      );
    }

    // Group records by period
    const groupedRecords = this.groupRecordsByPeriod(records, period);

    // Calculate summary
    const summary: HealthStatisticsItemDto = {
      date: `${startDate} to ${endDate}`,
      steps: records.reduce((sum, record) => sum + record.steps, 0),
      duration: records.reduce((sum, record) => sum + record.duration, 0),
      calories: records.reduce((sum, record) => sum + record.calories, 0),
      distance: records.reduce((sum, record) => sum + record.distance, 0),
    };

    return {
      items: groupedRecords,
      summary,
    };
  }

  /**
   * Helper method to group records by period (day, week, month)
   */
  private groupRecordsByPeriod(
    records: HealthData[],
    period: StatisticsPeriod
  ): HealthStatisticsItemDto[] {
    if (period === StatisticsPeriod.DAY) {
      // For daily statistics, return each day's data
      return records.map((record) => ({
        date: record.date,
        steps: record.steps,
        duration: record.duration,
        calories: record.calories,
        distance: record.distance,
      }));
    }

    // For weekly or monthly statistics, group by week or month
    const groupedData = new Map<string, HealthStatisticsItemDto>();

    records.forEach((record) => {
      const date = new Date(record.date);
      let groupKey: string;

      if (period === StatisticsPeriod.WEEK) {
        // Get the week number (ISO week)
        const weekNumber = this.getISOWeek(date);
        const year = date.getFullYear();
        groupKey = `${year}-W${weekNumber}`;
      } else {
        // Month
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // getMonth() is 0-indexed
        groupKey = `${year}-${month.toString().padStart(2, "0")}`;
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          date: groupKey,
          steps: 0,
          duration: 0,
          calories: 0,
          distance: 0,
        });
      }

      const group = groupedData.get(groupKey)!;
      group.steps += record.steps;
      group.duration += record.duration;
      group.calories += record.calories;
      group.distance += record.distance;
    });

    return Array.from(groupedData.values());
  }

  /**
   * Helper method to get ISO week number
   */
  private getISOWeek(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
