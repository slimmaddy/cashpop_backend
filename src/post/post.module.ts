import {forwardRef, Module} from "@nestjs/common";
import {PostArticleController} from "./post.controller";
import {PostArticleService} from "./post.service";
import {TypeOrmModule} from "@nestjs/typeorm";
import {PostArticle} from "./entities/post-article.entity";
import {User} from "../users/entities/user.entity";
import {FileUploadModule} from "../file-upload/file-upload.module";


@Module({
    imports: [
        TypeOrmModule.forFeature([PostArticle, User]),
        forwardRef(() => FileUploadModule)],
    controllers: [PostArticleController],
    providers: [PostArticleService],
    exports: []
})

export class PostArticleModule {
}