import {BaseEntity} from "../../common/entity/base-entity";
import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";

@Entity("comments")
export class Comments extends BaseEntity {

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    @ApiProperty({description: "Users commented on the article"})
    user: User;

    @ManyToOne(() => PostArticle, {onDelete: "CASCADE"})
    @JoinColumn({name: "post_article_id"})
    @ApiProperty({description: "The article this comment belongs to"})
    postArticle: PostArticle;

    @Column()
    @ApiProperty({description: "Content of comment"})
    content: string

    @Column('simple-array', {name: "media_url", nullable: true})
    @ApiProperty({description: "List of URLs of images, videos, ... attached to comments"})
    mediaUrls: string[];

    @ManyToOne(() => Comments, comment => comment.replies, {onDelete: 'CASCADE', nullable: true})
    @JoinColumn({name: 'parent_comment_id'})
    @ApiProperty({description: "The parent comment this comment replies to (if any)", required: false})
    parentComment: Comments;

    @OneToMany(() => Comments, comment => comment.parentComment)
    @ApiProperty({description: "Child comments (replies) to this comment"})
    replies: Comments[];
}