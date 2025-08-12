import {ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags,} from "@nestjs/swagger";
import {
    Body,
    Controller,
    Delete,
    FileTypeValidator,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Patch,
    Post,
    Put,
    Query,
    Request,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {CreatePostDto} from "./dto/create-post.dto";
import {PostArticleService} from "./post.service";
import {FileInterceptor, FilesInterceptor} from "@nestjs/platform-express";
import {PostArticle} from "./entities/post-article.entity";
import {ReactionDto} from "./dto/reaction.dto";
import {CommentDto} from "./dto/comment.dto";
import {CommentLikeDto} from "./dto/comment-like.dto";
import {PaginationDto} from "../common/requestDto/pagination.dto";
import {ReportPostDto} from "./dto/report-post.dto";
import {ReportCommentDto} from "./dto/report-comment.dto";
import {BlockCommentDto} from "./dto/block-comment.dto";

@ApiTags("article")
@Controller("article")
export class PostArticleController {
    constructor(private readonly postArticleService: PostArticleService) {
    }

    @Post()
    @ApiOperation({summary: "Create new a post article"})
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes("multipart/form-data")
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
    @ApiResponse({status: 404, description: "User not found"})
    @UseInterceptors(FilesInterceptor("files", 10))
    async create(
        @Request() req,
        @Body() createPostDto: CreatePostDto,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                    new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
                ],
                fileIsRequired: false,
            })
        )
        files?: Express.Multer.File[]
    ): Promise<any> {
        const userId = req.user?.userId;

        return this.postArticleService.create(userId, createPostDto, files);
    }

    @Patch(":idArticle")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({summary: "Update a post article"})
    @ApiConsumes("multipart/form-data")
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
    @ApiResponse({status: 404, description: "User not found"})
    @UseInterceptors(FilesInterceptor("files", 10))
    async update(
        @Param("idArticle") idArticle: string,
        @Body() createPostDto: CreatePostDto,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                    new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
                ],
                fileIsRequired: false,
            })
        )
        files?: Express.Multer.File[]
    ): Promise<PostArticle> {
        return this.postArticleService.updateArticle(
            idArticle,
            createPostDto,
            files
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({summary: "Get article user"})
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "article not found"})
    async getAllArticle(@Query("idUser") idUser: string,
                        @Query() {page = 1, pageSize = 10}: PaginationDto) {
        return this.postArticleService.getDataArticle(idUser, page, pageSize);
    }

    @UseGuards(JwtAuthGuard)
    @Get("detail/:idArticle")
    @ApiOperation({summary: "Get detail article"})
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "article not found"})
    async getArticle(@Param("idArticle") idArticle: string) {
        return this.postArticleService.detail(idArticle);
    }


    @Delete(":idArticle")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({summary: "Delete article by ID"})
    @ApiResponse({
        status: 200,
        description: "Post deleted successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async deleteArticle(@Param("idArticle") idArticle: string) {
        return this.postArticleService.deleteArticleById(idArticle)
    }

    // Api update post like

    @UseGuards(JwtAuthGuard)
    @Post("like")
    @ApiOperation({summary: "Update the like status of a post for a user "})
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "article not found"})
    @ApiResponse({
        status: 200,
        description: "Update the like status success"
    })
    @ApiBody({type: ReactionDto})
    async updateLike(@Body() reactionDto: ReactionDto) {
        return this.postArticleService.updatePostlike(reactionDto)
    }

    // Api to create view for post
    @UseGuards(JwtAuthGuard)
    @Post("views")
    @ApiOperation({summary: "Update the like status of a post for a user "})
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "article not found"})
    @ApiResponse({
        status: 201,
        description: "Update the like status success"
    })
    @ApiBody({type: ReactionDto})
    async createView(@Body() reactionDto: ReactionDto) {
        return this.postArticleService.createView(reactionDto)
    }

    // Api create comment to article

    @Post("comment")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes("multipart/form-data")
    @ApiBody({type: CommentDto})
    @ApiResponse({
        status: 201,
        description: "The comment article has been successfully created.",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    @UseInterceptors(FilesInterceptor("files", 5))
    async createComment(
        @Body() commentDto: CommentDto,
        @UploadedFiles(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 100 * 1024 * 1024}), // 100MB
                    new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv)$/}),
                ],
                fileIsRequired: false,
            })
        )
        files?: Express.Multer.File[]
    ) {
        return this.postArticleService.createComment(
            commentDto,
            files
        );
    }


    @Patch("comment/:idComment")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes("multipart/form-data")
    @ApiBody({type: CommentDto})
    @ApiResponse({
        status: 201,
        description: "The comment article has been successfully update.",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    @UseInterceptors(FilesInterceptor("files", 5))
    async updateComment(@Param("idComment") idComment: string, @Body() commentDto: CommentDto,
                        @UploadedFiles(new ParseFilePipe({
                            validators: [
                                new MaxFileSizeValidator({maxSize: 100 * 1024 * 1024}), // 100MB,
                                new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv)$/}),
                            ],
                            fileIsRequired: false,
                        })) files?: Express.Multer.File[]) {
        return this.postArticleService.updateComment(idComment, commentDto, files);
    }


    @Delete("comment/:idComment")
    @ApiOperation({summary: "delete comment article"})
    @UseGuards(JwtAuthGuard)
    @ApiResponse({
        status: 200,
        description: "Comment on post deleted successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async deleteComment(@Param("idComment") idComment: string) {
        return this.postArticleService.deleteComment(idComment);
    }

    @Put("like-comment")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({summary: "Update like/unlike status for a comment "})
    @ApiBody({type: CommentLikeDto})
    @ApiResponse({
        status: 200,
        description: "Comment on post deleted successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async updateLikeComment(@Body() commentLikeDto: CommentLikeDto) {
        return this.postArticleService.updateLikeComment(commentLikeDto);
    }

    // Api report

    @Post("report-article")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({summary: "Create an article report "})
    @ApiBody({type: ReportPostDto})
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(FileInterceptor("file"))
    @ApiResponse({
        status: 201,
        description: "Create report article successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async createReportArticle(
        @Body() reportPostDto: ReportPostDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                    new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
                ],
                fileIsRequired: false,
            }),
        )
        file?: Express.Multer.File) {
        return this.postArticleService.createReport(reportPostDto, file)
    }

    @Post("report-comment")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({summary:"Create a comment report"})
    @ApiBody({type: ReportCommentDto})
    @ApiConsumes("multipart/form-data")
    @UseInterceptors(FileInterceptor("file"))
    @ApiResponse({
        status: 201,
        description: "Create report comment successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async createReportComment(@Body() reportCommentDto: ReportCommentDto,
                              @UploadedFile(
                                  new ParseFilePipe({
                                      validators: [
                                          new MaxFileSizeValidator({maxSize: 5 * 1024 * 1024}), // 5MB
                                          new FileTypeValidator({fileType: /(jpg|jpeg|png|gif|webp)$/}),
                                      ],
                                      fileIsRequired: false,
                                  }),
                              )
                              file?: Express.Multer.File) {
        return this.postArticleService.createReportComment(reportCommentDto, file)
    }

    @Post("block-comment")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiBody({type: BlockCommentDto})
    @ApiResponse({
        status: 201,
        description: "Create block comment successfully",
    })
    @ApiResponse({
        status: 401,
        description: "Unauthorized - User is not authenticated.",
    })
    @ApiResponse({
        status: 400,
        description: "Bad Request - Invalid input data.",
    })
    @ApiResponse({status: 404, description: "Url not found"})
    async crateBlockComment(@Body() blockCommentDto: BlockCommentDto) {
        return this.postArticleService.createBlockComments(blockCommentDto);
    }

}