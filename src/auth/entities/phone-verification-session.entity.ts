import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

@Entity("phoneSessions")
@Index(['userId'])
@Index(['phoneNumber'])
@Index(['expiresAt'])
export class PhoneVerificationSession {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty({ description: "The unique identifier of the verification session" })
  id: string;

  @Column()
  @ApiProperty({ description: "The user ID requesting verification" })
  userId: string;

  @Column()
  @ApiProperty({ description: "The phone number to be verified" })
  phoneNumber: string;

  @Column()
  @ApiProperty({ description: "Hashed OTP code" })
  otp: string;

  @Column()
  @ApiProperty({ description: "When the session expires" })
  expiresAt: Date;

  @Column({ default: 0 })
  @ApiProperty({ description: "Number of verification attempts" })
  attempts: number;

  @Column()
  @ApiProperty({ description: "Hashed full residence registration number" })
  residenceNumberHash: string;

  @Column()
  @ApiProperty({ description: "First 6 digits of residence registration number" })
  residencePrefix: string;

  @Column()
  @ApiProperty({ description: "Phone carrier (SKT, KT, LG U+)" })
  phoneCarrier: string;

  @Column()
  @ApiProperty({ description: "Username for verification" })
  username: string;

  @CreateDateColumn()
  @ApiProperty({ description: "When the session was created" })
  createdAt: Date;
}
