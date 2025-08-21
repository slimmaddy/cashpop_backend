import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { AuthProvider } from "../entities/user.entity";

@Exclude()
export class ProfileResponseDto {
  @Expose()
  @ApiProperty({ description: "The unique identifier of the user" })
  id: string;

  @Expose()
  @ApiProperty({ description: "The username of the user" })
  username: string;

  @Expose()
  @ApiProperty({ description: "The email address of the user" })
  email: string;

  @Expose()
  @ApiProperty({ description: "The full name of the user", maxLength: 50 })
  name: string;

  @Expose()
  @ApiProperty({
    description: "The authentication provider used for this user",
    enum: AuthProvider,
  })
  provider: AuthProvider;

  @Expose()
  @ApiProperty({ description: "The avatar URL of the user", required: false })
  avatar: string;

  @Expose()
  @ApiProperty({ description: "The height of the user in cm", required: false })
  height: number;

  @Expose()
  @ApiProperty({ description: "The weight of the user in kg", required: false })
  weight: number;

  @Expose()
  @ApiProperty({
    description: "The sex of the user (male/female/other)",
    required: false,
    enum: ["male", "female", "other"],
  })
  sex: string;

  @Expose()
  @ApiProperty({
    description: "The date of birth of the user",
    required: false,
  })
  dateOfBirth: Date;

  @Expose()
  @ApiProperty({
    description: "The residential area of the user",
    required: false,
  })
  residentialArea: string;

  @Expose()
  @ApiProperty({
    description: "The invite code that can be shared with other users",
  })
  inviteCode: string;

  @Expose()
  @ApiProperty({ description: "The phone number of the user", required: false })
  phoneNumber: string;

  @Expose()
  @ApiProperty({ description: "Whether the phone number is verified", required: false })
  phoneVerified: boolean;

  @Expose()
  @ApiProperty({ description: "The phone carrier (SKT, KT, LG U+)", required: false })
  phoneCarrier: string;

  @Expose()
  @ApiProperty({ description: "Overall identity verification status", required: false })
  identityVerified: boolean;

  @Expose()
  @ApiProperty({ description: "When the phone was verified", required: false })
  phoneVerifiedAt: Date;

  @Expose()
  @ApiProperty({ description: "The date when the user was created" })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: "The date when the user was last updated" })
  updatedAt: Date;

  constructor(partial: Partial<ProfileResponseDto>) {
    Object.assign(this, partial);
  }
}
