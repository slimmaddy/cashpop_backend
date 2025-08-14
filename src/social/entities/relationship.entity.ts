import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum RelationshipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  BLOCKED = "blocked",
  REJECTED = "rejected",
  RECEIVED = "received",
}

@Entity("relationships")
@Index(["userEmail", "friendEmail"], { unique: true })
@Index(["userEmail", "status"])
@Index(["friendEmail", "status"])
@Index(["status", "createdAt"])
@Index(["userEmail", "status", "createdAt"])
@Index(["friendEmail", "status", "createdAt"])
@Index(["initiatedBy", "status"])
export class Relationship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userEmail: string;

  @Column()
  friendEmail: string;

  @Column({
    type: "enum",
    enum: RelationshipStatus,
    default: RelationshipStatus.PENDING,
  })
  status: RelationshipStatus;

  @Column()
  initiatedBy: string; // email của người gửi lời mời kết bạn

  @Column({ type: "text", nullable: true })
  message: string; // Tin nhắn kèm theo lời mời kết bạn

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  blockedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations removed - using email directly instead of foreign keys
}
