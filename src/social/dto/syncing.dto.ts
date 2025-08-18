import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateIf
} from "class-validator";

export enum SyncPlatform {
  CONTACT = "contact",
  PHONE = "phone",
  FACEBOOK = "facebook",
  LINE = "line",
}

export class FacebookSyncDataDto {
  @ApiProperty({
    description: "Facebook access token from client",
    example: "EAABwzLixnjYBAO7ZC4...",
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class LineSyncDataDto {
  @ApiProperty({
    description: "LINE access token from client",
    example: "U1234567890abcdef1234567890abcdef",
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class PhoneSyncDataDto {
  @ApiProperty({
    description: "Phone verification session ID from previous OTP verification",
    example: "uuid-session-id",
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: "Contact list from phone as JSON array",
    example: "[{\"name\":\"John Doe\",\"phone\":\"+821012345678\"},{\"name\":\"Jane Smith\",\"phone\":\"+821087654321\"}]",
  })
  @IsString()
  @IsNotEmpty()
  contactsJson: string;
}

export class SyncContactDto {
  @ApiProperty({
    description: "Choose your platform to sync",
    enum: SyncPlatform,
    example: SyncPlatform.FACEBOOK,
  })
  @IsEnum(SyncPlatform)
  platform: SyncPlatform;

  @ApiProperty({
    description: "Facebook sync data",
    type: FacebookSyncDataDto,
    required: false,
  })
  @ValidateIf((o) => o.platform === SyncPlatform.FACEBOOK)
  @IsNotEmpty()
  facebook?: FacebookSyncDataDto;

  @ApiProperty({
    description: "LINE sync data",
    type: LineSyncDataDto,
    required: false,
  })
  @ValidateIf((o) => o.platform === SyncPlatform.LINE)
  @IsNotEmpty()
  line?: LineSyncDataDto;

  @ApiProperty({
    description: "Phone sync data",
    type: PhoneSyncDataDto,
    required: false,
  })
  @ValidateIf((o) => o.platform === SyncPlatform.PHONE)
  @IsNotEmpty()
  phone?: PhoneSyncDataDto;
}

export interface ContactInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  platform: SyncPlatform;
}

export interface SyncResultDto {
  platform: SyncPlatform;
  totalContacts: number;
  cashpopUsersFound: number;
  newFriendshipsCreated: number;
  alreadyFriends: number;
  errors: string[];
  details: {
    contactsProcessed: ContactInfo[];
    newFriends: Array<{
      email: string;
      name: string;
      source: string;
    }>;
  };
  executionTime?: number; // ✅ ADD: Optional execution time in milliseconds
  testMode?: boolean; // ✅ ADD: Flag to indicate test mode
}

export class SyncContactsResponseDto {
  @ApiProperty({
    description: "Sync status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Message",
    example: "Sync Facebook successfully",
  })
  message: string;

  @ApiProperty({
    description: "Sync result",
  })
  result: SyncResultDto;
}
