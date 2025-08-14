import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class CursorPaginationDto {
  @ApiProperty({
    description: "Cursor for pagination (timestamp or ID)",
    required: false,
    example: "2025-01-15T10:00:00.000Z"
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: "Number of items to return",
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: "Search query",
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CursorPaginationResponseDto<T> {
  @ApiProperty({
    description: "Array of data items",
    type: "array"
  })
  data: T[];

  @ApiProperty({
    description: "Pagination information"
  })
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
    totalCount?: number; // Optional for performance
  };

  @ApiProperty({
    description: "Request metadata",
    required: false
  })
  meta?: {
    limit: number;
    search?: string;
    executionTime?: number;
  };
}

export interface CursorConfig {
  field: string; // Field to use for cursor (createdAt, id, etc.)
  direction: 'ASC' | 'DESC';
  type: 'date' | 'uuid' | 'number';
}

export class GetFriendsWithCursorDto extends CursorPaginationDto {
  @ApiProperty({
    description: "Sort by field",
    enum: ['createdAt', 'acceptedAt', 'name'],
    default: 'createdAt',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'acceptedAt' | 'name' = 'createdAt';

  @ApiProperty({
    description: "Sort direction",
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false
  })
  @IsOptional()
  @IsString()
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}

export class GetFriendRequestsWithCursorDto extends CursorPaginationDto {
  @ApiProperty({
    description: "Sort by field",
    enum: ['createdAt', 'name'],
    default: 'createdAt',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'name' = 'createdAt';

  @ApiProperty({
    description: "Sort direction", 
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false
  })
  @IsOptional()
  @IsString()
  sortDir?: 'ASC' | 'DESC' = 'DESC';
}