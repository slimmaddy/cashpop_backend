import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Response DTO for suggestions
 */
export class SuggestionResponseDto {
  @ApiProperty({ description: 'Suggested user information' })
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    avatar?: string;
  };

  @ApiProperty({
    description: 'Number of common friends',
    example: 3
  })
  mutualFriendsCount: number;

  @ApiProperty({
    description: 'List of a few friends (maximum 3)',
    type: [Object],
    example: [
      { id: 'uuid', name: 'John Doe' },
      { id: 'uuid', name: 'Jane Smith' }
    ]
  })
  mutualFriends: Array<{
    id: string;
    name: string;
  }>;

  @ApiProperty({
    description: 'Reason for suggestion',
    example: 'You have 3 mutual friends'
  })
  reason: string;
}

/**
 * Query parameters for  suggestions API
 */
export class GetSuggestionsDto {
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
    default: 10,
    required: false,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}