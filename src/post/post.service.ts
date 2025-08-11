import {HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {PostArticle} from "./entities/post-article.entity";
import {CreatePostDto} from "./dto/create-post.dto";
import {User} from "../users/entities/user.entity";
import {FileUploadService} from "../file-upload/file-upload.service";
import {ReactionDto} from "./dto/reaction.dto";
import {PostLikes} from "./entities/post-likes.entity";
import {ApiResponse} from "../common/response/ApiResponse";
import {PostViews} from "./entities/post-views.entity";
import {CommentDto} from "./dto/comment.dto";
import {Comments} from "./entities/comments.entity";
import {CommentLikeDto} from "./dto/comment-like.dto";
import {CommentLikesEntity} from "./entities/comment-likes.entity";
import {PaginatedResponse} from "../common/response/paginated-response";

@Injectable()
export class PostArticleService {

    private readonly logger = new Logger();

    constructor(
        @InjectRepository(PostArticle)
        private postRepository: Repository<PostArticle>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly fileUploadService: FileUploadService,
        @InjectRepository(PostLikes)
        private postLikesRepository: Repository<PostLikes>,
        @InjectRepository(PostViews)
        private postViewRepository: Repository<PostViews>,
        @InjectRepository(Comments)
        private commentsRepository: Repository<Comments>,
        @InjectRepository(CommentLikesEntity)
        private commentLikeRepository: Repository<CommentLikesEntity>
    ) {
    }

    /**
     * @param idUser of the user whose posts to get.
     * @param page number of pages to get (starting from 1).
     * @param pageSize number of posts per page.
     * @Returns a Promise containing an array of post objects.
     */
    async getDataArticle(idUser: string, page: number, pageSize: number): Promise<ApiResponse> {
        this.logger.log(`Request getDataArticle => idUser: ${idUser}, page: ${page}, pageSize: ${pageSize}`);

        const skip = (page - 1) * pageSize;

        //The query contains all the conditions, joins, selects, and subquery counts.
        const query = this.postRepository
            .createQueryBuilder('post_article')
            .innerJoinAndSelect('post_article.user', 'users')
            .select([
                'post_article.title as title',
                'post_article.content as contents',
                'post_article.mediaUrls as mediaUrls',
                'post_article.longitude as longitude',
                'post_article.latitude as latitudes',
                'post_article.createdAt as createdAt',
                'post_article.id as idArticle',
                'users.username as userName',
                'users.name as name',
                'users.avatar as avatar',
                'users.id as idUser'
            ])
            .addSelect(sub => {
                return sub.select('COUNT(*)')
                    .from(PostLikes, 'likes')
                    .where('likes.postArticle = post_article.id');
            }, 'countLikeArticle')
            .addSelect(sub => {
                return sub.select('COUNT(*)')
                    .from(PostViews, 'views')
                    .where('views.postArticle = post_article.id');
            }, 'countViews')
            .addSelect(sub => {
                return sub.select('COUNT(*)')
                    .from(Comments, 'comments')
                    .where('comments.postArticle = post_article.id');
            }, 'countComments')
            .where('users.id = :id', {id: idUser})


        // Get data and total number of posts
        const total = await query.getCount();

        // Get pagination data
        const article = await query
            .orderBy('post_article.createdAt', 'DESC')
            .offset(skip)
            .limit(pageSize)
            .getRawMany();
        this.logger.log(`List of posts by user with id: ${idUser}  ==> ${JSON.stringify(article)}`);

        return ApiResponse.success(PaginatedResponse(article, page, pageSize, total), "List of article data", HttpStatus.OK);

    }


    /**
     * @param idArticle ID of the article to get
     * @Returns a post object
     */
    async detail(idArticle: string) {
        const post = await this.postRepository.findOne({
            where: {id: idArticle}
        });

        if (!post) {
            throw new NotFoundException(`Article with ID "${idArticle}" does not exist.`);
        }

        return post;
    }

    /**
     * create a new post
     * Creates a new post for a specific user.
     * @param idUser The unique identifier of the user who is creating the post.
     * @param createDto The data transfer object containing the post details.
     * @param files Optional image file to upload post article
     * @returns A promise that resolves to the newly created PostArticle entity
     */
    async create(idUser: string, createDto: CreatePostDto, files?: Express.Multer.File[]): Promise<any> {
        this.logger.log(`request data CreatePostDto post: ${JSON.stringify(createDto)} \n ID User post article: ${idUser}`);

        // Check if user is in database
        const user = await this.userRepository.findOne({
            where: {id: idUser}
        });

        if (!user) {
            this.logger.error(`User with ID ${idUser} not found.`);
            throw new NotFoundException(`User with ID ${idUser} not found`);
        }

        // If the image exists upload it to aws 3 and save it to CreatePostDto
        if (files && files.length > 0) {
            const uploadedUrls = await this.uploadImage(files);
            this.logger.log(`Path after uploading image and saving to CreatePostDto : ${uploadedUrls}`)
            createDto.mediaUrls = uploadedUrls
        }

        // Create a new Post object and assign properties
        const newPost = this.postRepository.create({
            title: createDto.title,
            content: createDto.content,
            mediaUrls: createDto.mediaUrls,
            longitude: createDto.longitude,
            latitude: createDto.latitude,
            user: user
        })
        this.logger.log(`New post object created:  ${JSON.stringify(newPost)}`);

        // Save new post database
        return await this.postRepository.save(newPost);
    }

    /**
     * @param idArticle the unique ID of the article to update.
     * @param createDto the updated data, including fields that can be changed.
     * @param files the newly uploaded image files to replace or add to the article.
     * @returns Promise<any> Returns the updated article.
     */
    async updateArticle(idArticle: string, createDto: CreatePostDto, files?: Express.Multer.File[]): Promise<PostArticle> {
        this.logger.log(`Id article update : ${idArticle} \n Data update article : ${JSON.stringify(createDto)}`)

        // Finds an existing article by its ID
        const article = await this.postRepository.findOneBy({
            id: idArticle
        });
        if (!article) {
            this.logger.error(`Article with id is not found: ${idArticle}}`)
            throw new NotFoundException(`Article with id is not found: ${idArticle}}`)
        }

        // If the image exists upload it to aws3 and save it to CreatePostDto
        if (files && files.length > 0) {
            const uploadedUrls = await this.uploadImage(files);
            this.logger.log(`Path after uploading image and saving to CreatePostDto : ${uploadedUrls}`)
            createDto.mediaUrls = uploadedUrls;
        }

        // Update only the fields that are provided
        Object.keys(createDto).forEach(key => {
            if (createDto[key] !== undefined) {
                article[key] = createDto[key];
            }
        });
        this.logger.log(`Article after update :  ${JSON.stringify(article)} `)

        // Save the updated user
        return await this.postRepository.save(article);

    }

    /**
     * @param idArticle ID of the comment to be deleted
     */
    async deleteArticleById(idArticle: string): Promise<{ message: string }> {
        try {
            const result = await this.postRepository.delete(idArticle);
            if (result.affected === 0) {
                this.logger.error(`Deleting post with this ID: ${idArticle} failed `)
                throw new InternalServerErrorException("Delete article failed")
            }
            return {message: "Delete article successfully"}
        } catch (error) {
            this.logger.error(`Failed to delete article with id ${idArticle}: ${error.message}`);
            throw new InternalServerErrorException('Failed to delete article');
        }

    }

    /**
     * @Return Update the "like" status of a post for a user.
     * The function will toggle: if the user has liked the post, it will cancel the like (unlike),
     * otherwise, if it has not liked, it will create a new like record.
     * @param reactionDto Object containing information about the user and the post that needs to update the like.
     */
    async updatePostlike(reactionDto: ReactionDto): Promise<ApiResponse> {
        this.logger.log(`Updated post like data : ${JSON.stringify(reactionDto)}`)

        // Check if User by ID is in data
        const user = await this.findUserById(reactionDto.idUser)

        // Check if Article by ID is in data
        const article = await this.findArticleById(reactionDto.idArticle)

        // Check if user has liked the post
        const postLike = await this.postLikesRepository.findOne({
            where: {
                user: {id: reactionDto.idUser},
                postArticle: {id: reactionDto.idArticle}
            }
        })

        // Check the current "like" status of the post with this user
        try {
            if (postLike) {
                // If like -> unlike (delete)
                await this.postLikesRepository.delete(postLike.id);
                this.logger.log(`User ${user.id} unliked article ${article.id}.`);
            } else {
                // If not like -> like (create new)
                const newPostlike = this.postLikesRepository.create({
                    user: user,
                    postArticle: article
                });

                await this.postLikesRepository.save(newPostlike);
                this.logger.log(`User ${user.id} liked article ${article.id}.`);

                return ApiResponse.success(
                    article,
                    "Update the like status of a post for a user  ",
                    HttpStatus.OK
                )
            }
        } catch (error) {
            this.logger.error(`Error processing post like for user ${user.id} and article ${article.id}: ${error.message}`);
            throw new InternalServerErrorException("Error processing post like.");
        }
    }

    /**
     * @Return Create a new view for the post by the user
     * .If the user has already viewed the post, do not create a new record.
     * @param reactionDto User information (User id) and article (Article) need to update views.
     */
    async createView(reactionDto: ReactionDto): Promise<ApiResponse> {
        this.logger.log(`Updated post view data : ${JSON.stringify(reactionDto)}`)

        // Check if User by ID is in data
        const user = await this.findUserById(reactionDto.idUser)

        // Check if Article by ID is in data
        const article = await this.findArticleById(reactionDto.idArticle)

        // Check if user has views the post
        const postView = await this.postViewRepository.findOne({
            where: {
                user: {id: reactionDto.idUser},
                postArticle: {id: reactionDto.idArticle}
            }
        })

        // Create new views for the article
        try {
            if (!postView) {
                // create new views
                const newPostView = this.postViewRepository.create({
                    user: user,
                    postArticle: article
                });
                this.logger.log(`Created new post view: ${JSON.stringify(newPostView)}`);

                // Save post view in database
                await this.postViewRepository.save(newPostView);

                return ApiResponse.success(
                    article,
                    "Update the view status of a post for a user",
                    HttpStatus.OK
                )
            }
        } catch (error) {
            this.logger.error(`Error processing post view for user ${user.id} and article ${article.id}: ${error.message}`);
            throw new InternalServerErrorException("Error processing post view.");
        }
    }

    // Comments article

    /**
     * This function performs the following steps:
     * - Validates the existence of the user and post based on the ID.
     * - Creates a new comment object with the provided content.
     * - Saves the new comment to the database.
     * @Return Add a new comment to the post from the user.
     * @param commentDto The object contains the user ID, post ID, and comment content.
     * @param files Upload image files, videos, ... to add to comments
     */
    async createComment(commentDto: CommentDto, files?: Express.Multer.File[]): Promise<ApiResponse> {
        this.logger.log(`Create comment data : ${JSON.stringify(commentDto)}`)

        // Check if User by ID is in data
        const user = await this.findUserById(commentDto.idUser)

        // Check if Article by ID is in data
        const article = await this.findArticleById(commentDto.idArticle)

        // Convert contents array in commentDto to JSON string
        const contentString = JSON.stringify(commentDto.contents);
        this.logger.log(`The contents data has been converted to a JSON string: ${contentString}`)

        // If the image exists upload it to aws3 and save it to CreatePostDto
        if (files && files.length > 0) {
            const uploadedUrls = await this.uploadImage(files);
            this.logger.log(`Path after uploading and saving to comments : ${uploadedUrls}`)
            commentDto.mediaUrls = uploadedUrls;
        }

        let parentComment = null;
        if (commentDto.parentCommentId) {
            parentComment = await this.commentsRepository.findOne({
                where: {id: commentDto.parentCommentId}
            })
            if (!parentComment) {
                this.logger.error(`Parent comment with id ${commentDto.parentCommentId} not found`);
                throw new NotFoundException(`Parent comment not found`)
            }
        }

        try {
            // Create new comment
            const newComment = this.commentsRepository.create({
                user: user,
                postArticle: article,
                content: contentString,
                mediaUrls: commentDto.mediaUrls,
                parentComment: parentComment || null
            })
            this.logger.log(`User ${user.id} created a new comment on article ${article.id}: "${commentDto.contents}"`)

            // Save comment to database
            await this.commentsRepository.save(newComment)
            return ApiResponse.success(
                newComment.content,
                "Comment on article successfully",
                HttpStatus.OK
            )
        } catch (error) {
            this.logger.error(`Error processing comment for user ${user.id} and article ${article.id}: ${error.message}`);
            throw new InternalServerErrorException("Error processing comment.");
        }
    }


    /**
     * Update comment data based on comment ID.
     * The function performs the following steps:
     * - Find and check the existence of the comment by ID.
     * - Process the conversion of content (contents) to JSON string.
     * - Process file upload if any and assign the file URL to the comment.
     * - Update the necessary fields on the comment.
     * - Save the updated comment to the database.
     * @param idComment The ID of the comment to be updated.
     * @param commentDto Comment update data (content, ...).
     * @param files The uploaded files (if any) to attach to the comment.
     * @returns ApiResponse success or error result.
     */
    async updateComment(
        idComment: string,
        commentDto: CommentDto,
        files?: Express.Multer.File[],
    ): Promise<ApiResponse> {
        this.logger.log(`Update comment data: ${JSON.stringify(commentDto)}`);

        // Find the comment to update
        const comment = await this.commentsRepository.findOne({
            where: {
                id: idComment,
            },
        });

        if (!comment) {
            this.logger.error(`Comment with id: ${idComment} not found`);
            throw new NotFoundException(`Comment with id: ${idComment} not found`);
        }

        // Convert contents array to JSON string to save to DB if needed
        const contentString = JSON.stringify(commentDto.contents);
        this.logger.log(`The contents data has been converted to a JSON string: ${contentString}`);

        // If there is an upload file, call the upload function and assign the return url to commentDto.mediaUrls
        if (files && files.length > 0) {
            const uploadedUrls = await this.uploadImage(files);
            this.logger.log(`Path after uploading and saving to comments: ${uploadedUrls}`);
            commentDto.mediaUrls = uploadedUrls;
        }

        try {
            // Update properties to existing comment
            comment.content = contentString;
            comment.mediaUrls = commentDto.mediaUrls;

            // Save updated comment to DB
            await this.commentsRepository.save(comment);

            return ApiResponse.success(
                comment.content,
                "Comment on article updated successfully",
                HttpStatus.OK,
            );
        } catch (error) {
            this.logger.error(
                `Error processing comment update for id ${idComment}: ${error.message}`,
            );
            throw new InternalServerErrorException("Error processing comment.");
        }
    }

    /**
     * @param idComment ID of the comment to be deleted
     */
    async deleteComment(idComment: string): Promise<{ message: string }> {
        try {
            const result = await this.commentsRepository.delete(idComment);

            if (result.affected === 0) {
                throw new NotFoundException(`Comment with id ${idComment} not found`);
            }
            return {message: "Delete comment successfully"};
        } catch (error) {
            this.logger.error(`Failed to delete comment with id ${idComment}: ${error.message}`);
            throw new InternalServerErrorException('Failed to delete comment');
        }
    }

    /**
     * Handles like/unlike actions for a comment by a specific user.
     * The function performs the following steps:
     * - Checks the existence of the user and comment based on the ID in `commentLikeDto`.
     * - Finds the existing like record of the user with that comment.
     * - If it has liked, delete the record (unlike).
     * - If it has not liked, create a new like record (like).
     * - Saves the changes to the database and logs the operations.
     * @param commentLikeDto Object containing idUser and idComment information
     */
    async updateLikeComment(commentLikeDto: CommentLikeDto): Promise<ApiResponse> {
        this.logger.log(`Updated data like comment : ${JSON.stringify(commentLikeDto)}`)

        // Check if User by ID is in data
        const user = await this.findUserById(commentLikeDto.idUser);

        // check if comment by ID is in data
        const comment = await this.findCommentById(commentLikeDto.idComment)

        // Find comment like records by specific user
        const commentLike = await this.commentLikeRepository.findOne({
            where: {
                user: {id: user.id},
                comments: {id: comment.id}
            }
        })

        try {
            if (commentLike) {
                // If like -> unlike (delete)
                await this.commentLikeRepository.delete(commentLike.id);
                this.logger.log(`User ${user.id} unliked comment ${commentLike.id}.`);
            } else {
                // If not like -> like (create new)
                const newCommentLike = this.commentLikeRepository.create({
                    user: user,
                    comments: comment
                });

                // save to like comment db
                await this.commentLikeRepository.save(newCommentLike);
                this.logger.log(`User ${user.id} liked comment ${comment.id}.`);

                return ApiResponse.success(
                    comment,
                    "Update the like status of a comment for a user",
                    HttpStatus.OK
                )
            }
        } catch (error) {
            this.logger.error(`Error processing post like for user ${user.id} and article ${comment.id}: ${error.message}`);
            throw new InternalServerErrorException("Error processing post like.");
        }

    }

    /**
     * Create 1 string[] url image
     * @param files Optional image file to upload post article
     * @private
     */
    private async uploadImage(files?: Express.Multer.File[]): Promise<string[]> {
        try {
            const uploadPromises = files.map(file =>
                this.fileUploadService.uploadFile(file, 'avatar')
            );
            const uploadedUrls = await Promise.all(uploadPromises);
            this.logger.log(`Path after uploading image and saving to CreatePostDto: ${uploadedUrls}`);
            return uploadedUrls;
        } catch (error) {
            this.logger.error(`Failed to upload one or more files: ${error.message}`);
            throw new InternalServerErrorException('Failed to upload images');
        }
    }

    /**
     * @Returns The user object corresponding to the ID.
     * @param idUser ID of the user to find.
     */
    private async findUserById(idUser: string): Promise<User> {
        const user = this.userRepository.findOne({
            where: {id: idUser}
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${idUser} not found`);
        }

        this.logger.log(`User with ID ${idUser} : ${JSON.stringify(user)}`)
        return user;
    }

    /**
     * @Returns the PostArticle object corresponding to the ID.
     * @param idArticle ID of the article to find.
     */
    private async findArticleById(idArticle: string): Promise<PostArticle> {
        const article = await this.postRepository.findOne({
            where: {id: idArticle}
        });
        if (!article) {
            throw new NotFoundException(`Article with ID ${idArticle} not found`);
        }

        this.logger.log(`Article with ID ${idArticle} : ${JSON.stringify(article)}`)
        return article;
    }

    /**
     *
     * @param idComment Find and return comments by ID.
     * @Return the found Comment object.
     */
    private async findCommentById(idComment: string): Promise<Comments> {
        const comment = await this.commentsRepository.findOne({
            where: {id: idComment}
        })
        if (!comment) {
            throw new NotFoundException(`Comment with ID ${idComment} not found`)
        }

        this.logger.log(`Comment with ID ${idComment} : ${JSON.stringify(comment)}`)
        return comment;
    }

}