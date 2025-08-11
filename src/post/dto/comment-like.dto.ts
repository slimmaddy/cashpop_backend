import {ApiProperty} from "@nestjs/swagger";
import {IsNotEmpty, IsString} from "class-validator";

export class CommentLikeDto {

    @ApiProperty({
        description: "The unique identifier of the user",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
        required: true,
    })
    @IsString()
    @IsNotEmpty({message: "Id user is required"})
    idUser: string

    @ApiProperty({
        description: "Unique identifier of the comment",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...",
        required: true
    })
    @IsString()
    @IsNotEmpty({message: "Id comment is required"})
    idComment: string

}