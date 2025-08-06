import {Injectable, InternalServerErrorException, Logger, NotFoundException} from "@nestjs/common";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {PostArticle} from "./entities/post-article.entity";
import {CreatePostDto} from "./dto/create-post.dto";
import {User} from "../users/entities/user.entity";
import {FileUploadService} from "../file-upload/file-upload.service";

@Injectable()
export class PostArticleService {

    private readonly logger = new Logger();

    constructor(
        @InjectRepository(PostArticle)
        private postRepository: Repository<PostArticle>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly fileUploadService: FileUploadService
    ) {
    }

    /**
     * @param idUser of the user whose posts to get.
     * @Returns a Promise containing an array of post objects.
     */
    async getData(idUser: string) {
        const article =  this.postRepository.createQueryBuilder('post_article')
            .innerJoinAndSelect('post_article.user', 'users')
            .where('users.id = :id', {id: idUser})
            .getMany();
        this.logger.log(`List of posts by user with this id : ===> ${idUser}`)
        return article;
    }

    /**
     * @param idArticle ID of the article to get
     * @Returns a post object
     */
    async detail(idArticle: string) {
        const post = await this.postRepository.findOne({
            where:{id: idArticle}
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
        this.logger.log(`request data CreatePostDto post: ==> ${JSON.stringify(createDto)} \n ID User post article: ===> ${idUser}`);

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
    async updateArticle(idArticle: string, createDto: CreatePostDto, files?: Express.Multer.File[]): Promise<any> {
        this.logger.log(`Id article update : ==> ${idArticle} \n  Data update article : ==> ${JSON.stringify(createDto)}`)

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

}