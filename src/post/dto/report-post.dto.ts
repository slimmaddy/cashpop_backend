import {IsNotEmpty, IsOptional, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class ReportPostDto {

    @IsString()
    @IsOptional()
    @ApiProperty({
        description: "Image URL illustrating the report.",
        example: "https://example.com/image1.jpg",
    })
    imageUrl: string

    @ApiProperty({
        description: "ID of the report reason",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
        required: true
    })
    @IsString()
    @IsNotEmpty({message: "Id report reason is required"})
    idReportReason: string

    @ApiProperty({
        description: "ID of the article",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
        required: true
    })
    @IsString()
    @IsNotEmpty({message: "Id article is required"})
    idArticle: string

    @ApiProperty({
        description: "ID of the user",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
        required: true
    })
    @IsString()
    @IsNotEmpty({message: "Id user is required"})
    idUser: string

    @ApiProperty({
        description: "Optional detailed description of the report post.",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
    })
    @IsString()
    @IsOptional()
    description: string


}