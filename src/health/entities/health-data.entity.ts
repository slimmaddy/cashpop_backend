import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../users/entities/user.entity";

@Entity("health_data")
export class HealthData {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty({
    description: "The unique identifier of the health data record",
  })
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  @ApiProperty({ description: "The user associated with this health data" })
  user: User;

  @Column({ name: "user_id" })
  @Index()
  @ApiProperty({
    description: "The ID of the user associated with this health data",
  })
  userId: string;

  @Column({ type: "date" })
  @Index()
  @ApiProperty({
    description: "The date of the health data record (YYYY-MM-DD)",
  })
  date: string;

  @Column({ type: "int", default: 0 })
  @ApiProperty({ description: "Number of steps taken" })
  steps: number;

  @Column({ type: "int", default: 0 })
  @ApiProperty({ description: "Total duration of activity in seconds" })
  duration: number;

  @Column({ type: "float", default: 0 })
  @ApiProperty({ description: "Total calories burned" })
  calories: number;

  @Column({ type: "float", default: 0 })
  @ApiProperty({ description: "Total distance covered in meters" })
  distance: number;

  @Column({ type: "varchar", length: 50 })
  @ApiProperty({
    description:
      "Source of the health data (e.g., 'ios_health', 'android_health')",
  })
  source: string;

  @CreateDateColumn()
  @ApiProperty({ description: "The date when the record was created" })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: "The date when the record was last updated" })
  updatedAt: Date;
}
