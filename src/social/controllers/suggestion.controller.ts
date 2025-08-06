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
    return this.suggestionService.getSuggestions(req.user.userId, query);
  }
}
