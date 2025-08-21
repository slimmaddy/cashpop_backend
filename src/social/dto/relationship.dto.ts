import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { RelationshipStatus } from "../entities/relationship.entity";

/**
 * Response DTO for friends list - contains only essential information for display
 */
export class RelationshipResponseDto {
  @ApiProperty({ description: "Relationship ID" })
  id: string;

  @ApiProperty({ description: "Friend user information" })
  friend: {
    id: string;
    email: string; // ✅ Email is primary identifier
    username: string; // ✅ Username always exists (not null)
    name: string; // ✅ Display name
    avatar?: string; // ✅ Avatar can be null
  };

  @ApiProperty({
    description: "Relationship status - always accepted for this endpoint",
    enum: RelationshipStatus,
    example: "accepted",
  })
  status: RelationshipStatus;

  @ApiProperty({
    description: "Who initiated the relationship",
    required: false,
  })
  initiatedBy?: string;

  @ApiProperty({
    description: "Optional message when sending friend request",
    required: false,
  })
  message?: string;

  @ApiProperty({ description: "When the relationship was created" })
  createdAt: Date;

  @ApiProperty({
    description: "When the relationship was accepted",
    required: false,
  })
  acceptedAt?: Date;
}

/**
 * Query parameters for friends list API - simplified to only need pagination and search
 */
export class GetFriendsDto {
  @ApiProperty({
    description: "Page number",
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: "Items per page",
    default: 20,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: "Search by friend name or username",
    required: false,
    example: "john",
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO for sending friend request
 */
export class SendFriendRequestDto {
  @ApiProperty({
    description: "Email of the person to send friend request to",
    example: "friend@example.com",
  })
  @IsEmail({}, { message: "Invalid email" })
  friendEmail: string;

  @ApiProperty({
    description: "Optional accompanying message",
    required: false,
    example: "Hello! I would like to be friends with you.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "Message cannot exceed 500 characters" })
  message?: string;
}

/**
 * Response DTO when sending friend request
 */
export class SendFriendRequestResponseDto {
  @ApiProperty({ description: "Success status" })
  success: boolean;

  @ApiProperty({ description: "Response message" })
  message: string;

  @ApiProperty({ description: "Relationship data if created", required: false })
  relationship?: RelationshipResponseDto;
}

/**
 * Response DTO for received friend request
 */
export class FriendRequestDto {
  @ApiProperty({ description: "Request ID" })
  id: string;

  @ApiProperty({ description: "Sender user information" })
  sender: {
    id: string;
    email: string;
    username: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty({ description: "Message from sender", required: false })
  message?: string;

  @ApiProperty({ description: "When the request was created" })
  createdAt: Date;

  @ApiProperty({ description: "Whether current user can accept this request" })
  canAccept: boolean;

  @ApiProperty({ description: "Whether current user can reject this request" })
  canReject: boolean;
}

/**
 * Query parameters for friend requests API
 */
export class GetFriendRequestsDto {
  @ApiProperty({
    description: "Page number",
    default: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: "Items per page",
    default: 20,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Response DTO for accept/reject friend request
 */
export class FriendRequestActionResponseDto {
  @ApiProperty({ description: "Success status" })
  success: boolean;

  @ApiProperty({ description: "Response message" })
  message: string;

  @ApiProperty({ description: "Updated relationship data", required: false })
  relationship?: RelationshipResponseDto;

  @ApiProperty({
    description: "Request ID that was processed",
    required: false,
  })
  requestId?: string;
}
