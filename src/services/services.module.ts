import { Module } from "@nestjs/common";
import { ValkeyService } from "./valkey.service";
import { MailerService } from "./mailer.service";

@Module({
  providers: [ValkeyService, MailerService],
  exports: [ValkeyService, MailerService],
})
export class ServicesModule {}
