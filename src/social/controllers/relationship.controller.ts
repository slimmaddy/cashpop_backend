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
import { RelationshipService } from '../services/relationship.service';
import {
  RelationshipResponseDto,
  GetFriendsDto,
} from '../dto/relationship.dto';

@ApiTags('Friends')
@Controller('social/friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  @Get()
  @ApiOperation({
    summary: 'Get a list of friends',
  })
  // @ApiQuery({
  //   name: 'page',
  //   required: false,
  //   description: 'Số trang (bắt đầu từ 1)',
  //   example: 1
  // })
  // @ApiQuery({
  //   name: 'limit',
  //   required: false,
  //   description: 'Số lượng bạn bè trên mỗi trang (tối đa 100)',
  //   example: 20
  // })
  // @ApiQuery({
  //   name: 'search',
  //   required: false,
  //   description: 'Tìm kiếm theo tên hoặc username của bạn bè',
  //   example: 'john'
  // })
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
    return this.relationshipService.getFriends(req.user.userId, query);
  }
}
