import { Module } from '@nestjs/common';
import { ValkeyService } from './valkey.service';
import { MailerService } from './mailer.service';
import { SmsService } from './sms.service';

@Module({
  providers: [ValkeyService, MailerService, SmsService],
  exports: [ValkeyService, MailerService, SmsService],
})
export class ServicesModule {}
