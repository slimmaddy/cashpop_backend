import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger";
import {IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, Min} from "class-validator";

export class CreatePostDto {
    @ApiProperty({
        description: "Title of the article",
        example: "Cherry Blossom Festival",
        required: true
    })
    @IsString({message: "Title must be a string"})
    @IsNotEmpty({message: "Title is required"})
    title: string

    @ApiPropertyOptional({
        description: "Detailed content of the post.",
    })
    @IsOptional()
    @IsString({message: "Content must be a string"})
    content?: string;

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

    @IsOptional()
    @ApiProperty({description: "Latitude of location", example: 40.7128})
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @IsOptional()
    @ApiProperty({description: "Longitude of location", example: -74.0060})
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

}