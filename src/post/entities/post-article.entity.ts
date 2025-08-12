import {Column, Entity, JoinColumn, ManyToOne} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";
import {User} from "../../users/entities/user.entity";
import {BaseEntity} from "../../common/entity/base-entity";

@Entity('post_article')
export class PostArticle extends BaseEntity {

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    @ApiProperty({description: "Users related to the article"})
    user: User;

    @Column()
    @ApiProperty({description: "Title of the article"})
    title: string

    @Column({name: "content", nullable: true})
    @ApiProperty({description: "Describe the content of the post"})
    content: string

    @Column('simple-array', {name: "media_url", nullable: true})
    @ApiProperty({description: "List of URLs of images or GIFs attached to the post"})
    mediaUrls: string[];

    @ApiProperty({description: "Geographic longitude where the article was posted"})
    @Column({
        nullable: true
    })
    longitude: number;

    @ApiProperty({description: "Geographic latitude where the article was posted"})
    @Column({
        nullable: true
    })
    latitude: number;
}