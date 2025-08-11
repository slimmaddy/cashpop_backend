import {BaseEntity} from "../../common/entity/base-entity";
import {Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";


@Entity("post_likes")
export class PostLikes extends BaseEntity{

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    @ApiProperty({description: "The user associated with this health data"})
    user: User;

    @ManyToOne(() => PostArticle, { onDelete: "CASCADE" })
    @JoinColumn({ name: "post_article_id" })
    @ApiProperty({ description: "The article this comment belongs to" })
    postArticle: PostArticle;

}