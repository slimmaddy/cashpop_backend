import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, Length, Matches, IsPhoneNumber } from 'class-validator';

export enum PhoneCarrier {
  SKT = 'SKT',
  KT = 'KT',
  LG_UPLUS = 'LG U+'
}

export class InitiatePhoneVerificationDto {
  @ApiProperty({
    description: 'Username for verification',
    example: 'john_doe',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @Length(2, 50, { message: 'Tên người dùng phải từ 2-50 ký tự' })
  username: string;

  @ApiProperty({
    description: 'First 6 digits of residence registration number (YYMMDD)',
    example: '900101',
    pattern: '^\\d{6}$'
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Số đăng ký cư trú (6 chữ số đầu) không hợp lệ' })
  residencePrefix: string;

  @ApiProperty({
    description: 'Last 7 digits of residence registration number (sensitive)',
    example: '1234567',
    pattern: '^\\d{7}$'
  })
  @IsString()
  @Matches(/^\d{7}$/, { message: 'Số đăng ký cư trú (7 chữ số cuối) không hợp lệ' })
  residenceSuffix: string;

  @ApiProperty({
    description: 'Phone carrier',
    enum: PhoneCarrier,
    example: PhoneCarrier.SKT
  })
  @IsEnum(PhoneCarrier, { message: 'Nhà mạng không được hỗ trợ' })
  phoneCarrier: PhoneCarrier;

  @ApiProperty({
    description: 'Korean phone number',
    example: '+821012345678'
  })
  @IsPhoneNumber('KR', { message: 'Số điện thoại không đúng định dạng Hàn Quốc' })
  phoneNumber: string;
}

export class VerifyPhoneOtpDto {
  @ApiProperty({
    description: 'Verification session ID',
    example: 'uuid-session-id'
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'Mã OTP chỉ được chứa chữ số' })
  otp: string;
}

export class PhoneVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'OTP đã được gửi đến số điện thoại'
  })
  message: string;

  @ApiProperty({
    description: 'Verification session ID',
    example: 'uuid-session-id',
    required: false
  })
  sessionId?: string;

  @ApiProperty({
    description: 'When the session expires',
    example: '2025-01-11T10:35:00.000Z',
    required: false
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Masked phone number for confirmation',
    example: '+8210****5678',
    required: false
  })
  maskedPhone?: string;
}

export class PhoneVerificationStatusDto {
  @ApiProperty({
    description: 'Whether phone is verified',
    example: true
  })
  phoneVerified: boolean;

  @ApiProperty({
    description: 'Verified phone number',
    example: '+821012345678',
    required: false
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Phone carrier',
    example: 'SKT',
    required: false
  })
  phoneCarrier?: string;

  @ApiProperty({
    description: 'Overall identity verification status',
    example: true
  })
  identityVerified: boolean;

  @ApiProperty({
    description: 'When phone was verified',
    example: '2025-01-11T10:35:00.000Z',
    required: false
  })
  phoneVerifiedAt?: Date;
}
