import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthService } from "./health.service";
import { HealthController } from "./health.controller";
import { HealthData } from "./entities/health-data.entity";
import { AttestationService } from "./attestation.service";
import { ServicesModule } from "../services/services.module";

@Module({
  imports: [TypeOrmModule.forFeature([HealthData]), ServicesModule],
  controllers: [HealthController],
  providers: [HealthService, AttestationService],
  exports: [HealthService, AttestationService],
})
export class HealthModule {}
