import {ReactionDto} from "./reaction.dto";
import {ApiProperty} from "@nestjs/swagger";
import {IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, Max} from "class-validator";

export class CommentDto extends ReactionDto {
    @ApiProperty({
        description: "Array of content parts representing the comment body as ordered elements",
        example: "helo.......",
        required: true,
    })
    @IsNotEmpty({message: "Comment content cannot be blank"})
    @IsString()
    contents: string;

    @ApiProperty({
        description: "List of attached image or video URLs.",
        example: ["https://example.com/image1.jpg", "https://example.com/image2.png"],
        type: [String],
    })
    @IsOptional()
    @IsArray({message: "MediaUrls must be an array"})
    @IsString({each: true, message: "Each element in MediaUrls must be a string."})
    @IsUrl({}, {each: true, message: "Each element in MediaUrls must be a valid URL"})
    @Max(5)
    mediaUrls?: string[];

    @ApiProperty({
        description: "ID of the original comment this comment is replying to",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        type: String,
        required: false
    })
    @IsOptional()
    @IsString()
    parentCommentId?: string

}