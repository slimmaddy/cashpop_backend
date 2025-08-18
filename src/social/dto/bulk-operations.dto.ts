import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsOptional, IsString } from "class-validator";

export class BulkSendFriendRequestDto {
  @ApiProperty({
    description: "Array of friend emails to send requests to",
    type: [String],
    minItems: 1,
    maxItems: 20,
    example: ["friend1@example.com", "friend2@example.com"]
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Phải có ít nhất 1 email" })
  @ArrayMaxSize(20, { message: "Tối đa 20 email mỗi lần" })
  @IsEmail({}, { each: true, message: "Tất cả phải là email hợp lệ" })
  friendEmails: string[];

  @ApiProperty({
    description: "Optional message for all friend requests",
    required: false,
    maxLength: 200,
    example: "Hãy kết bạn với tôi nhé!"
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class BulkAcceptFriendRequestDto {
  @ApiProperty({
    description: "Array of friend request IDs to accept",
    type: [String],
    minItems: 1,
    maxItems: 50,
    example: ["uuid1", "uuid2", "uuid3"]
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Phải có ít nhất 1 request ID" })
  @ArrayMaxSize(50, { message: "Tối đa 50 requests mỗi lần" })
  @IsString({ each: true })
  requestIds: string[];
}

export class BulkRejectFriendRequestDto {
  @ApiProperty({
    description: "Array of friend request IDs to reject",
    type: [String],
    minItems: 1,
    maxItems: 50,
    example: ["uuid1", "uuid2", "uuid3"]
  })
  @IsArray()
  @ArrayMinSize(1, { message: "Phải có ít nhất 1 request ID" })
  @ArrayMaxSize(50, { message: "Tối đa 50 requests mỗi lần" })
  @IsString({ each: true })
  requestIds: string[];
}

export interface BulkOperationResult {
  email?: string;
  requestId?: string;
  success: boolean;
  message: string;
  error?: string;
}

export class BulkOperationResponseDto {
  @ApiProperty({
    description: "Whether the bulk operation was successful overall",
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: "Summary message",
    example: "Bulk operation completed: 8/10 successful"
  })
  message: string;

  @ApiProperty({
    description: "Number of successful operations",
    example: 8
  })
  successCount: number;

  @ApiProperty({
    description: "Number of failed operations",
    example: 2
  })
  failureCount: number;

  @ApiProperty({
    description: "Total number of operations attempted",
    example: 10
  })
  total: number;

  @ApiProperty({
    description: "Detailed results for each operation",
    type: "array",
    items: {
      type: "object",
      properties: {
        email: { type: "string", example: "friend1@example.com" },
        requestId: { type: "string", example: "uuid1" },
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Friend request sent successfully" },
        error: { type: "string", example: "User already friend" }
      }
    }
  })
  results: BulkOperationResult[];
}