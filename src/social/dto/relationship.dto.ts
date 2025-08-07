import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsEmail, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { RelationshipStatus } from '../entities/relationship.entity';

/**
 * Response DTO cho danh sách bạn bè - chỉ chứa thông tin cần thiết để hiển thị
 */
export class RelationshipResponseDto {
  @ApiProperty({ description: 'Relationship ID' })
  id: string;

  @ApiProperty({ description: 'Friend user information' })
  friend: {
    id: string;
    email: string;        // ✅ Email là primary identifier
    username: string;     // ✅ Username luôn có (not null)
    name: string;         // ✅ Tên hiển thị
    avatar?: string;      // ✅ Avatar có thể null
  };

  @ApiProperty({
    description: 'Relationship status - luôn là accepted cho endpoint này',
    enum: RelationshipStatus,
    example: 'accepted'
  })
  status: RelationshipStatus;

  @ApiProperty({ description: 'Who initiated the relationship', required: false })
  initiatedBy?: string;

  @ApiProperty({ description: 'Optional message when sending friend request', required: false })
  message?: string;

  @ApiProperty({ description: 'When the relationship was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the relationship was accepted', required: false })
  acceptedAt?: Date;
}

/**
 * Query parameters cho API lấy danh sách bạn bè - đơn giản hóa chỉ cần pagination và search
 */
export class GetFriendsDto {
  @ApiProperty({
    description: 'Page number',
    default: 1,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    default: 20,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Search by friend name or username',
    required: false,
    example: 'john'
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO để gửi lời mời kết bạn
 */
export class SendFriendRequestDto {
  @ApiProperty({ 
    description: 'Email của người muốn gửi lời mời kết bạn',
    example: 'friend@example.com'
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  friendEmail: string;

  @ApiProperty({ 
    description: 'Tin nhắn kèm theo (tùy chọn)', 
    required: false,
    example: 'Xin chào! Tôi muốn kết bạn với bạn.'
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Tin nhắn không được vượt quá 500 ký tự' })
  message?: string;
}

/**
 * Response DTO khi gửi lời mời kết bạn
 */
export class SendFriendRequestResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Relationship data if created', required: false })
  relationship?: RelationshipResponseDto;
}

/**
 * Response DTO cho lời mời kết bạn đã nhận
 */
export class FriendRequestDto {
  @ApiProperty({ description: 'Request ID' })
  id: string;

  @ApiProperty({ description: 'Sender user information' })
  sender: {
    id: string;
    email: string;
    username: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty({ description: 'Message from sender', required: false })
  message?: string;

  @ApiProperty({ description: 'When the request was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Whether current user can accept this request' })
  canAccept: boolean;

  @ApiProperty({ description: 'Whether current user can reject this request' })
  canReject: boolean;
}

/**
 * Query parameters cho API lấy lời mời kết bạn
 */
export class GetFriendRequestsDto {
  @ApiProperty({
    description: 'Page number',
    default: 1,
    required: false,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    default: 20,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Response DTO cho accept/reject friend request
 */
export class FriendRequestActionResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Updated relationship data', required: false })
  relationship?: RelationshipResponseDto;

  @ApiProperty({ description: 'Request ID that was processed', required: false })
  requestId?: string;
}
