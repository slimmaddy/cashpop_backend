import {IsNotEmpty, IsString} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class BlockCommentDto {

    @ApiProperty({
        description: "User blocked from commenting",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6....",
        required: true
    })
    @IsString()
    @IsNotEmpty()
    idBlockUser: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: "User blocked this comment",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6....",
        required: true
    })
    idBlockByUser: string

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        description: "Posts where users block comments",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.....",
        required: true
    })
    idArticle: string

}