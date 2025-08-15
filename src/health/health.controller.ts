import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { CreateHealthDataDto } from "./dto/create-health-data.dto";
import {
  HealthStatisticsQueryDto,
  HealthStatisticsResponseDto,
  StatisticsPeriod,
} from "./dto/health-statistics.dto";
import { TodayHealthDataDto } from "./dto/today-health-data.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AttestationService } from "./attestation.service";
import { AttestationNonceResponseDto } from "./dto/attestation-nonce.dto";

@ApiTags("health")
@Controller("health")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly attestationService: AttestationService
  ) {}

  @Post()
  @ApiOperation({
    summary: "Submit health data from mobile device with attestation",
  })
  @ApiBody({ type: CreateHealthDataDto })
  @ApiResponse({
    status: 201,
    description: "Health data has been successfully submitted",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid attestation or nonce",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - attestation verification failed",
  })
  async create(
    @Request() req,
    @Body() createHealthDataDto: CreateHealthDataDto
  ) {
    const userId = req.user.userId;

    // Validate and use the nonce
    await this.attestationService.validateAndUseNonce(
      userId,
      createHealthDataDto.nonce
    );

    // Verify the attestation
    const isAttestationValid = await this.attestationService.verifyAttestation(
      createHealthDataDto.platform,
      createHealthDataDto.attestationToken,
      createHealthDataDto.nonce
    );

    if (!isAttestationValid) {
      throw new UnauthorizedException("Attestation verification failed");
    }

    // Check for implausible health data
    this.validateHealthDataPlausibility(createHealthDataDto);

    // Submit the health data
    return this.healthService.create(userId, createHealthDataDto);
  }

  /**
   * Validate health data for plausibility
   */
  private validateHealthDataPlausibility(data: CreateHealthDataDto): void {
    // Check for unreasonably high step counts (e.g., more than 100,000 steps in a day)
    if (data.steps > 100000) {
      throw new BadRequestException("Step count is implausibly high");
    }

    // Check for unreasonably high calorie burn (e.g., more than 10,000 calories in a day)
    if (data.calories > 10000) {
      throw new BadRequestException("Calorie count is implausibly high");
    }

    // Check for unreasonably high distance (e.g., more than 100 km in a day)
    if (data.distance > 100000) {
      // 100 km in meters
      throw new BadRequestException("Distance is implausibly high");
    }

    // Check for unreasonably high duration (e.g., more than 24 hours in a day)
    if (data.duration > 86400) {
      // 24 hours in seconds
      throw new BadRequestException("Duration is implausibly high");
    }
  }

  @Get("statistics")
  @ApiOperation({ summary: "Get health statistics by period" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: StatisticsPeriod,
    description: "Aggregation period (day, week, month)",
  })
  @ApiResponse({
    status: 200,
    description: "Returns health statistics for the specified period",
    type: HealthStatisticsResponseDto,
  })
  async getStatistics(
    @Request() req,
    @Query() query: HealthStatisticsQueryDto
  ) {
    return this.healthService.getStatistics(req.user.userId, query);
  }

  @Get("attestation-nonce")
  @ApiOperation({
    summary: "Get a new attestation nonce for device integrity verification",
  })
  @ApiResponse({
    status: 200,
    description: "Returns a new attestation nonce",
    type: AttestationNonceResponseDto,
  })
  async getAttestationNonce(@Request() req) {
    return this.attestationService.generateNonce(req.user.userId);
  }
}
