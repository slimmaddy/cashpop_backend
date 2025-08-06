import {
  Controller,
  Get,
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
import { FriendshipService } from '../services/friendship.service';
import {
  FriendshipResponseDto,
  GetFriendsDto,
} from '../dto/friendship.dto';

@ApiTags('Friends List')
@Controller('social/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách bạn bè',
    description: `
    Endpoint đơn giản để hiển thị danh sách bạn bè đã kết bạn thành công.

    Tính năng:
    - Chỉ hiển thị những friendship có status = 'accepted'
    - Hỗ trợ phân trang (pagination)
    - KHÔNG có search - chỉ hiển thị danh sách thuần túy
    - Trả về cả email và username của bạn bè (tất cả đều có username)
    - Sắp xếp theo thời gian kết bạn (mới nhất trước)
    `
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Số trang (bắt đầu từ 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng bạn bè trên mỗi trang (tối đa 100)',
    example: 20
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo tên hoặc username của bạn bè',
    example: 'john'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bạn bè thành công',
    schema: {
      type: 'object',
      properties: {
        friends: {
          type: 'array',
          items: { $ref: '#/components/schemas/FriendshipResponseDto' }
        },
        total: {
          type: 'number',
          description: 'Tổng số bạn bè',
          example: 25
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc token không hợp lệ'
  })
  async getFriends(
    @Req() req: any,
    @Query() query: GetFriendsDto
  ): Promise<{ friends: FriendshipResponseDto[]; total: number }> {
    console.log('🔍 Controller - req.user:', req.user);
    return this.friendshipService.getFriends(req.user.userId, query);
  }
}
