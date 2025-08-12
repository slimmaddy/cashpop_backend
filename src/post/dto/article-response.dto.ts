import {Exclude, Expose} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";

@Exclude()
export class ArticleResponseDto {
    @Expose()
    @ApiProperty({description: "Title of the article"})
    title: string;

    @Expose()
    @ApiProperty({description: "Main content of the article"})
    contents: string;

    @Expose()
    @ApiProperty({type: [String], description: "List of media URLs (images, videos) attached to the article"})
    mediaUrls: string[];

    @Expose()
    @ApiProperty({description: "Longitude of the article's geographical location"})
    longitude: number;

    @Expose()
    @ApiProperty({description: "Latitude of the article's geographical location"})
    latitude: number;

    @Expose()
    @ApiProperty({description: "Creation date of the article"})
    createdAtArticle: Date;

    @Expose()
    @ApiProperty({description: "Username of the article creator"})
    userName: string;

    @Expose()
    @ApiProperty({description: "Full name of the article creator"})
    name: string;

    @Expose()
    @ApiProperty({description: "Avatar URL of the article creator"})
    avatar: string;

    @Expose()
    @ApiProperty({description: "ID of the article creator"})
    idUser: string;

    @Expose()
    @ApiProperty({description: "ID of the article"})
    idArticle: string;

    @Expose()
    @ApiProperty({description: "Total number of likes on the article"})
    countLikeArticle: number;

    @Expose()
    @ApiProperty({description: "Total number of comments on the article"})
    countComment: number;

    @Expose()
    @ApiProperty({description: "Total number of views on the article"})
    countViews: number;
}
