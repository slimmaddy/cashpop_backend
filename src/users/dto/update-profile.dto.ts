import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
  MaxLength,
  IsEnum,
  IsUrl,
} from "class-validator";
import { Type } from "class-transformer";

enum Sex {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export class UpdateProfileDto {
  @ApiProperty({
    description: "The avatar URL of the user",
    example: "https://example.com/avatar.jpg",
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: "Avatar must be a valid URL" })
  avatar?: string;

  @ApiProperty({
    description: "The full name of the user",
    example: "John Doe",
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Name must be a string" })
  @MaxLength(50, { message: "Name cannot exceed 50 characters" })
  name?: string;

  @ApiProperty({
    description: "The height of the user in cm",
    example: 175.5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: "Height must be a number" })
  @Type(() => Number)
  height?: number;

  @ApiProperty({
    description: "The weight of the user in kg",
    example: 70.5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: "Weight must be a number" })
  @Type(() => Number)
  weight?: number;

  @ApiProperty({
    description: "The sex of the user",
    enum: Sex,
    example: "male",
    required: false,
  })
  @IsOptional()
  @IsEnum(Sex, { message: "Sex must be one of: male, female, other" })
  sex?: string;

  @ApiProperty({
    description: "The date of birth of the user",
    example: "1990-01-01",
    required: false,
  })
  @IsOptional()
  @IsDate({ message: "Date of birth must be a valid date" })
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiProperty({
    description: "The residential area of the user",
    example: "New York City",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "Residential area must be a string" })
  residentialArea?: string;
}
