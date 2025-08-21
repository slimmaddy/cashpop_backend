import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  GetSuggestionsDto,
  SuggestionResponseDto,
} from "../dto/suggestion.dto";
import { SuggestionService } from "../services/suggestion.service";
import { UserContextService } from "../services/user-context.service";
import { BaseSocialController } from "./base-social.controller";

@ApiTags("Friends")
@ApiBearerAuth()
@Controller("social/suggestions")
@UseGuards(JwtAuthGuard)
export class SuggestionController extends BaseSocialController {
  constructor(
    private readonly suggestionService: SuggestionService,
    userContextService: UserContextService
  ) {
    super(userContextService);
  }

  @Get()
  @ApiOperation({
    summary: "Get a list of suggestions to make friends",
  })
  @ApiResponse({
    status: 200,
    description: "List of suggestions for you",
    schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: { $ref: "#/components/schemas/SuggestionResponseDto" },
        },
        total: {
          type: "number",
          description: "Total number of suggestions",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Not logged in or invalid token",
  })
  async getSuggestions(
    @Req() req: any,
    @Query() query: GetSuggestionsDto
  ): Promise<{ suggestions: SuggestionResponseDto[]; total: number }> {
    this.logRequest("getSuggestions", req, { query });

    // ✅ OPTIMIZED: Using BaseSocialController with proper user validation
    const { user } = await this.getUserFromRequest(req);
    if (!user) {
      return this.createUserNotFoundResponse({ suggestions: [], total: 0 });
    }

    return this.suggestionService.getSuggestions(user.email, query);
  }
}
