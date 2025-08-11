import {forwardRef, Module} from "@nestjs/common";
import {PostArticleController} from "./post.controller";
import {PostArticleService} from "./post.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {PostArticle} from "./entities/post-article.entity";
import {User} from "../users/entities/user.entity";
import {FileUploadModule} from "../file-upload/file-upload.module";
import {PostLikes} from "./entities/post-likes.entity";
import {PostViews} from "./entities/post-views.entity";
import {Comments} from "./entities/comments.entity";
import {CommentLikesEntity} from "./entities/comment-likes.entity";


@Module({
    imports: [
        TypeOrmModule.forFeature([PostArticle, User, PostLikes, PostViews, Comments, CommentLikesEntity]),
        forwardRef(() => FileUploadModule)],
    controllers: [PostArticleController],
    providers: [PostArticleService],
    exports: []
})

export class PostArticleModule {
}