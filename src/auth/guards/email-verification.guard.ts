import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class EmailVerificationGuard extends AuthGuard("email-verification") {}
