import {ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags} from "@nestjs/swagger";
import {
    Body,
    Controller,
    FileTypeValidator, Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Patch,
    Post,
    Request,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {CreatePostDto} from "./dto/create-post.dto";
import {PostArticleService} from "./post.service";
import {FilesInterceptor} from '@nestjs/platform-express';

@ApiTags('article')
@Controller('article')
export class PostArticleController {
    constructor(private readonly postArticleService: PostArticleService) {
    }

    @Post()
    @ApiOperation({summary: "Create new a post article"})
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                title: {type: 'string', description: 'Post title'},
            },
        },
    })
    @ApiBody({type: CreatePostDto})
    @ApiResponse({
        status: 201,
        description: "The post article has been successfully created.",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: 'User not found'})
    @UseInterceptors(FilesInterceptor('files', 10))
    async create(@Request() req, @Body() createPostDto: CreatePostDto, @UploadedFiles(
        new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
            ],
            fileIsRequired: false,
        }),
    ) files?: Express.Multer.File[]): Promise<any> {

        const userId = req.user?.userId

        return this.postArticleService.create(userId, createPostDto, files);
    }

    @Patch(":idArticle")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({type: CreatePostDto})
    @ApiResponse({
        status: 201,
        description: "The post article has been successfully created.",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: 'User not found'})
    @UseInterceptors(FilesInterceptor('files', 10))
    async update(@Param("idArticle") idArticle: string, @Body() createPostDto: CreatePostDto, @UploadedFiles(
        new ParseFilePipe({
            validators: [
                new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
            ],
            fileIsRequired: false,
        }),
    ) files?: Express.Multer.File[]): Promise<any> {
        return this.postArticleService.updateArticle(idArticle, createPostDto, files)
    }

    @UseGuards(JwtAuthGuard)
    @Get(":idUser")
    @ApiOperation({ summary: 'Get article user' })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({ status: 404, description: 'article not found' })
    async getAllArticle(@Param("idUser") idUser: string) {
        return this.postArticleService.getData(idUser);
    }


    @UseGuards(JwtAuthGuard)
    @Get("detail/:idArticle")
    @ApiOperation({ summary: 'Get detail article' })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({ status: 404, description: 'article not found' })
    async getArticle(@Param("idArticle") idArticle: string) {
        return this.postArticleService.detail(idArticle);
    }
}