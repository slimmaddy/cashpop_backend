import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateIf,
  ArrayMaxSize,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum SyncPlatform {
  CONTACT = "contact",
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
    description: "Phone access token from client",
    example: "EAABwzLixnjYBAO7ZC4...",
  })
  @IsString()
  @IsNotEmpty()
  token: string;
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
