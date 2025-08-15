import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Avatar image file (optional)",
        },
        name: {
          type: "string",
          description: "User full name",
        },
        height: {
          type: "number",
          description: "User height in cm",
        },
        weight: {
          type: "number",
          description: "User weight in kg",
        },
        sex: {
          type: "string",
          enum: ["male", "female", "other"],
          description: "User sex",
        },
        dateOfBirth: {
          type: "string",
          format: "date",
          description: "User date of birth",
        },
        residentialArea: {
          type: "string",
          description: "User residential area",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated successfully",
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("file"))
  updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
        fileIsRequired: false,
      })
    )
    file?: Express.Multer.File
  ): Promise<ProfileResponseDto> {
    return this.usersService.updateProfile(
      req.user.userId,
      updateProfileDto,
      file
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({
    status: 200,
    description: "Profile retrieved successfully",
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(req.user.userId);
  }
}
