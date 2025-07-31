import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LineAuthDto {
    @ApiProperty({
        description: "The Line access token obtained from the mobile client",
        example: "U1234567890abcdef1234567890abcdef"
    })
    @IsString()
    @IsNotEmpty({ message: "Line access token is required" })
    token: string;
}

