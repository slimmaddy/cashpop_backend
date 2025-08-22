import {BaseEntity} from "../../common/entity/base-entity";
import {Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";


@Entity("block-comments")
export class BlockComments extends BaseEntity {

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "blocked_user_id "})
    @ApiProperty({description: "User is blocked; this person's comments will be hidden on the post"})
    blockUser: User;

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "blocked_by_user_id "})
    @ApiProperty({description: "The user who performs the blocking; can be the post owner or a normal user."})
    blockByUser: User;

    @ManyToOne(() => PostArticle, {onDelete: "CASCADE"})
    @JoinColumn({name: "post_article_id"})
    @ApiProperty({description: "Posts whose comments are blocked."})
    postArticle: PostArticle;

}