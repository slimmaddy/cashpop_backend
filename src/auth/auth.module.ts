import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module";
import { ServicesModule } from "../services/services.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { FacebookStrategy } from "./strategies/facebook.strategy";
import { RefreshStrategy } from "./strategies/refresh.strategy";
import { EmailVerificationStrategy } from "./strategies/email-verification.strategy";
import { TokenService } from "./token.service";
import { LineStrategy } from "./strategies/line.strategy";

// Phone Verification
import { PhoneVerificationSession } from "./entities/phone-verification-session.entity";

@Module({
  imports: [
    UsersModule,
    ServicesModule,
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([PhoneVerificationSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET", "your-secret-key"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRATION", "15m"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    LocalStrategy,
    JwtStrategy,
    RefreshStrategy,
    FacebookStrategy,
    EmailVerificationStrategy,
    LineStrategy,
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
