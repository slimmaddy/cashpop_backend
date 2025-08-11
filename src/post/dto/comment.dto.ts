import {ReactionDto} from "./reaction.dto";
import {ApiProperty} from "@nestjs/swagger";
import {IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested} from "class-validator";
import {Type} from "class-transformer";

class ContentPartDto {
    @ApiProperty({
        description: "Type of content element (e.g., 'text', 'icon')",
        example: "text,icon,...",
    })
    @IsNotEmpty({message: "Type is required"})
    @IsString({message: "Type must be a string"})
    type: string;

    @ApiProperty({
        description: "Value of the content element (text content or icon URL)",
        example: "Hello user ",
    })
    @IsNotEmpty({message: " Value is required"})
    @IsString({message: " Value must be a string"})
    value: string;
}

export class CommentDto extends ReactionDto {
    @ApiProperty({
        description: "Array of content parts representing the comment body as ordered elements",
        example: [
            {type: "text", value: "Where is this article at the beginning...."},
            {type: "icon", value: "https://example.com/icons/smile.png"}
        ],
        required: true,
        type: [ContentPartDto]
    })
    @IsNotEmpty({message: "Comment content cannot be blank"})
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => ContentPartDto)
    contents: ContentPartDto[];

    @ApiProperty({
        description: "List of attached image or video URLs.",
        example: ["https://example.com/image1.jpg", "https://example.com/image2.png"],
        type: [String],
    })
    @IsOptional()
    @IsArray({message: "MediaUrls must be an array"})
    @IsString({each: true, message: "Each element in MediaUrls must be a string."})
    @IsUrl({}, {each: true, message: "Each element in MediaUrls must be a valid URL"})
    mediaUrls?: string[];

    @ApiProperty({
        description: "ID of the original comment this comment is replying to",
        example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        type: String,
        required:false
    })
    @IsOptional()
    @IsString()
    parentCommentId?: string

}