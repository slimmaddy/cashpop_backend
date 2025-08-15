import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsProvider {
  sendOtp(phoneNumber: string, otp: string, carrier: string): Promise<boolean>;
}

@Injectable()
export class MockSmsService implements SmsProvider {
  private readonly logger = new Logger(MockSmsService.name);

  async sendOtp(phoneNumber: string, otp: string, carrier: string): Promise<boolean> {
    this.logger.log(`📱 Mock SMS to ${phoneNumber} (${carrier}): OTP = ${otp}`);
    
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock success (in real implementation, this would be based on actual SMS API response)
    return true;
  }
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: SmsProvider;

  constructor(private readonly configService: ConfigService) {
    // For now, always use mock service
    // In production, this would switch based on configuration
    const smsProvider = this.configService.get('SMS_PROVIDER', 'mock');
    
    switch (smsProvider) {
      case 'mock':
      default:
        this.provider = new MockSmsService();
        break;
      // Future providers can be added here:
      // case 'toast':
      //   this.provider = new ToastSmsService(configService);
      //   break;
      // case 'twilio':
      //   this.provider = new TwilioSmsService(configService);
      //   break;
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOtp(phoneNumber: string, otp: string, carrier: string): Promise<boolean> {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Validate Korean phone number
      if (!this.validateKoreanPhone(formattedPhone)) {
        this.logger.error(`Invalid Korean phone number: ${phoneNumber}`);
        return false;
      }

      // Send via provider
      const result = await this.provider.sendOtp(formattedPhone, otp, carrier);
      
      if (result) {
        this.logger.log(`SMS sent successfully to ${this.maskPhoneNumber(formattedPhone)}`);
      } else {
        this.logger.error(`Failed to send SMS to ${this.maskPhoneNumber(formattedPhone)}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`SMS sending error: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Format phone number to Korean standard
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different input formats
    if (cleaned.startsWith('82')) {
      // +82 or 82 prefix
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('010')) {
      // Local format 010-xxxx-xxxx
      cleaned = '+82' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+82')) {
      // Assume it needs +82 prefix
      cleaned = '+82' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate Korean phone number format
   */
  private validateKoreanPhone(phone: string): boolean {
    // Korean mobile number pattern: +82 10 xxxx xxxx
    const koreanMobileRegex = /^\+8210\d{8}$/;
    return koreanMobileRegex.test(phone);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 8) return phone;
    
    const start = phone.substring(0, phone.length - 8);
    const end = phone.substring(phone.length - 4);
    return `${start}****${end}`;
  }

  /**
   * Generate 6-digit OTP
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate OTP format
   */
  validateOtpFormat(otp: string): boolean {
    return /^\d{6}$/.test(otp);
  }
}
