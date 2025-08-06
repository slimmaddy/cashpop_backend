import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
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
