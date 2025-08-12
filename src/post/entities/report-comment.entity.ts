import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {User} from "../../users/entities/user.entity";
import {ApiProperty} from "@nestjs/swagger";
import {ReportReason} from "./report-reason.entity";
import {Comments} from "./comments.entity";
import {BaseEntity} from "../../common/entity/base-entity";

@Entity("report_comment")
export class ReportComment extends BaseEntity {

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    @ApiProperty({description: "The users related to article reporting data"})
    user: User;

    @ManyToOne(() => ReportReason, {onDelete: "CASCADE"})
    @JoinColumn({name: "report_reason_id"})
    @ApiProperty({description: "Data related to article report content"})
    reportReason: ReportReason;

    @ManyToOne(() => Comments, {onDelete: "CASCADE"})
    @JoinColumn({name: "comments_id"})
    @ApiProperty({description: "The reported comment associated with this report"})
    comments: Comments;

    @Column({name: "description", nullable: true})
    @ApiProperty({description: "Detailed content describing the reported violation of the article"})
    description: string

    @Column({name: "image_url"})
    @ApiProperty({description: "URL pointing to the illustrative image of the report article"})
    imageUrl: string

}