import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RelationshipService } from '../services/relationship.service';
import { UsersService } from '../../users/users.service';
import {
  RelationshipResponseDto,
  GetFriendsDto,
  SendFriendRequestDto,
  SendFriendRequestResponseDto,
  FriendRequestDto,
  GetFriendRequestsDto,
  FriendRequestActionResponseDto,
} from '../dto/relationship.dto';

@ApiTags('Friends')
@Controller('social/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RelationshipController {
  constructor(
    private readonly relationshipService: RelationshipService,
    private readonly usersService: UsersService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get a list of friends',
  })
  
  @ApiResponse({
    status: 200,
    description: 'Get a list of friends successfully',
    schema: {
      type: 'object',
      properties: {
        friends: {
          type: 'array',
          items: { $ref: '#/components/schemas/RelationshipResponseDto' }
        },
        total: {
          type: 'number',
          description: 'Total number of friends',
          example: 25
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Not logged in or invalid token'
  })
  async getFriends(
    @Req() req: any,
    @Query() query: GetFriendsDto
  ): Promise<{ friends: RelationshipResponseDto[]; total: number }> {
    console.log('🔍 Controller getFriends:');
    console.log('- req.user:', req.user);
    console.log('- req.user.userId:', req.user?.userId);
    console.log('- query:', query);

    // Lấy user từ database bằng userId
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      console.log('❌ User not found with userId:', req.user.userId);
      return { friends: [], total: 0 };
    }

    console.log('✅ Found user:', { id: user.id, email: user.email, username: user.username });

    return this.relationshipService.getFriends(user.email, query);
  }

  @Post('request')
  @ApiOperation({
    summary: 'Send an invitation to make friends by email',
    description: 'Send an invitation to make friends by email'
  })
  @ApiResponse({
    status: 201,
    description: 'Send the invitation to make friends successfully',
    type: SendFriendRequestResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Input data is invalid or unable to send invitations to yourself'
  })
  @ApiResponse({
    status: 404,
    description: 'Cannot find users with this email'
  })
  @ApiResponse({
    status: 409,
    description: 'Already a friend or invitation was sent earlier'
  })
  @ApiResponse({
    status: 401,
    description: 'Not logged in or invalid token'
  })
  async sendFriendRequest(
    @Req() req: any,
    @Body() sendFriendRequestDto: SendFriendRequestDto
  ): Promise<SendFriendRequestResponseDto> {
    console.log('🚀 Controller sendFriendRequest:');
    console.log('- req.user:', req.user);
    console.log('- sendFriendRequestDto:', sendFriendRequestDto);

    // Take user from database with userid
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      console.log('❌ User not found with userId:', req.user.userId);
      throw new Error('Không tìm thấy thông tin người dùng');
    }

    console.log('✅ Found user:', { id: user.id, email: user.email, username: user.username });

    return this.relationshipService.sendFriendRequest(user.email, sendFriendRequestDto);
  }

  @Get('requests/received')
  @ApiOperation({
    summary: 'Get a list of invitations to make friends',
    description: 'Display the list of friends that the current user has received (status = pending)'
  })
  @ApiResponse({
    status: 200,
    description: 'Get a list of successful invitations',
    schema: {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: { $ref: '#/components/schemas/FriendRequestDto' }
        },
        total: {
          type: 'number',
          description: 'Total number of requests',
          example: 5
        },
        page: {
          type: 'number',
          example: 1
        },
        limit: {
          type: 'number',
          example: 20
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Not logged in or invalid token'
  })
  async getFriendRequests(
    @Req() req: any,
    @Query() query: GetFriendRequestsDto
  ): Promise<{ requests: FriendRequestDto[]; total: number }> {
    console.log('🔍 Controller getFriendRequests:');
    console.log('- req.user:', req.user);
    console.log('- query:', query);

    // Take user from database with userid
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      console.log('❌ User not found with userId:', req.user.userId);
      return { requests: [], total: 0 };
    }

    console.log('✅ Found user:', { id: user.id, email: user.email, username: user.username });

    return this.relationshipService.getFriendRequests(user.email, query);
  }

  @Post('requests/:requestId/accept')
  @ApiOperation({
    summary: 'Chấp nhận lời mời kết bạn',
    description: 'Chấp nhận lời mời kết bạn cụ thể, cập nhật status thành accepted'
  })
  @ApiResponse({
    status: 200,
    description: 'Chấp nhận lời mời thành công',
    type: FriendRequestActionResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý'
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ'
  })
  async acceptFriendRequest(
    @Req() req: any,
    @Param('requestId') requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    console.log('🚀 Controller acceptFriendRequest:');
    console.log('- req.user:', req.user);
    console.log('- requestId:', requestId);

    // Lấy user từ database bằng userId
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      console.log('❌ User not found with userId:', req.user.userId);
      throw new Error('Không tìm thấy thông tin người dùng');
    }

    console.log('✅ Found user:', { id: user.id, email: user.email, username: user.username });

    return this.relationshipService.acceptFriendRequest(user.email, requestId);
  }

  @Post('requests/:requestId/reject')
  @ApiOperation({
    summary: 'Từ chối lời mời kết bạn',
    description: 'Từ chối lời mời kết bạn cụ thể, cập nhật status thành rejected'
  })
  @ApiResponse({
    status: 200,
    description: 'Từ chối lời mời thành công',
    type: FriendRequestActionResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý'
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ'
  })
  async rejectFriendRequest(
    @Req() req: any,
    @Param('requestId') requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    console.log('🚀 Controller rejectFriendRequest:');
    console.log('- req.user:', req.user);
    console.log('- requestId:', requestId);

    // Lấy user từ database bằng userId
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      console.log('❌ User not found with userId:', req.user.userId);
      throw new Error('Không tìm thấy thông tin người dùng');
    }

    console.log('✅ Found user:', { id: user.id, email: user.email, username: user.username });

    return this.relationshipService.rejectFriendRequest(user.email, requestId);
  }
}
