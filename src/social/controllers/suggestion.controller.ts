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
import { SuggestionService } from '../services/suggestion.service';
import {
  SuggestionResponseDto,
  GetSuggestionsDto,
} from '../dto/suggestion.dto';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('social/suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get a list of suggestions to make friends',
  })
//   @ApiQuery({
//     name: 'page',
//     required: false,
//     description: 'Số trang (bắt đầu từ 1)',
//     example: 1
//   })
//   @ApiQuery({
//     name: 'limit',
//     required: false,
//     description: 'Số lượng gợi ý trên mỗi trang (tối đa 50)',
//     example: 10
//   })
  @ApiResponse({
    status: 200,
    description: 'List of suggestions for you',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { $ref: '#/components/schemas/SuggestionResponseDto' }
        },
        total: {
          type: 'number',
          description: 'Total number of suggestions'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Not logged in or invalid token'
  })
  async getSuggestions(
    @Req() req: any,
    @Query() query: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResponseDto[]; total: number }> {
    return this.suggestionService.getSuggestions(req.user.email, query);
  }

  // @Get('search')
  // @ApiOperation({
  //   summary: 'Tìm kiếm user theo email để gợi ý kết bạn',
  //   description: `
  //   Tìm kiếm user theo email address.
  //   Sử dụng lại method findByEmail từ UsersService.

  //   Trả về user suggestion nếu:
  //   - Email tồn tại trong hệ thống
  //   - Không phải chính mình
  //   - Chưa là bạn bè
  //   `
  // })
  // @ApiQuery({
  //   name: 'email',
  //   required: true,
  //   description: 'Email address để tìm kiếm',
  //   example: 'friend@example.com'
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'User suggestion found',
  //   type: SuggestionResponseDto
  // })
  // @ApiResponse({
  //   status: 404,
  //   description: 'User not found hoặc đã là bạn bè'
  // })
  // async searchUserByEmail(
  //   @Req() req: any,
  //   @Query('email') email: string
  // ): Promise<SuggestionResponseDto | { message: string }> {
  //   const suggestion = await this.suggestionService.getSuggestionByEmail(req.user.email, email);

  //   if (!suggestion) {
  //     return { message: 'User not found or already connected' };
  //   }

  //   return suggestion;
  // }
}
