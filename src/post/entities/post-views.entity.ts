import {BaseEntity} from "../../common/entity/base-entity";
import {Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";


@Entity("post_view")
export class PostViews extends BaseEntity{

    @ManyToOne(() => PostArticle, { onDelete: "CASCADE" })
    @JoinColumn({ name: "post_article_id" })
    @ApiProperty({ description: "The article this comment belongs to" })
    postArticle: PostArticle;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    @ApiProperty({ description: "Users commented on the article" })
    user: User;

}