import {BaseEntity} from "../../common/entity/base-entity";
import {Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";
import {Comments} from "./comments.entity";

@Entity("comment_likes")
export class CommentLikesEntity extends BaseEntity{

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    @ApiProperty({ description: "Users commented on the article" })
    user: User;

    @ManyToOne(() => Comments, { onDelete: "CASCADE" })
    @JoinColumn({ name: "comments_id" })
    @ApiProperty({ description: "The article this comment belongs to" })
    comments: Comments;

}