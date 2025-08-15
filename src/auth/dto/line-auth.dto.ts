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

    @ApiProperty({
        description: "The Line ID token (JWT) obtained from the mobile client",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    })
    @IsString()
    @IsNotEmpty({ message: "Line ID token is required" })
    id_token: string;
}
