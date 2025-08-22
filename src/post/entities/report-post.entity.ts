import {BaseEntity} from "../../common/entity/base-entity";
import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {PostArticle} from "./post-article.entity";
import {ReportReason} from "./report-reason.entity";

@Entity("report_post")
export class ReportPost extends BaseEntity {

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    @ApiProperty({description: "The users related to article reporting data"})
    user: User;

    @ManyToOne(() => ReportReason, {onDelete: "CASCADE"})
    @JoinColumn({name: "report_reason_id"})
    @ApiProperty({description: "Data related to article report content"})
    reportReason: ReportReason;

    @ManyToOne(() => PostArticle, {onDelete: "CASCADE"})
    @JoinColumn({name: "post_article_id"})
    @ApiProperty({description: "The reported post article associated with this report"})
    postArticle: PostArticle;

    @Column({name: "description",nullable:true})
    @ApiProperty({description: "Detailed content describing the reported violation of the article"})
    description: string

    @Column({name: "image_url"})
    @ApiProperty({description: "URL pointing to the illustrative image of the report article"})
    imageUrl: string

}