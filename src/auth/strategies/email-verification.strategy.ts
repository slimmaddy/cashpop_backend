import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class EmailVerificationStrategy extends PassportStrategy(
  Strategy,
  "email-verification"
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("token"),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET", "your-secret-key"),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    if (!payload.email) {
      throw new UnauthorizedException("Invalid token payload");
    }

    if (payload.email !== req.body.email) {
      throw new UnauthorizedException("Email mismatch");
    }

    return { email: payload.email };
  }
}
