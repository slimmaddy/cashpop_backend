import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { HealthCheckResponseDto } from "./dto/health-check-response.dto";

@ApiTags("Health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Health check successful",
    type: HealthCheckResponseDto,
  })
  getHello(): HealthCheckResponseDto {
    return this.appService.getHello();
  }
}
