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
@Index(["status", "createdAt"])
export class Relationship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_email" })
  userEmail: string;

  @Column({ name: "friend_email" })
  friendEmail: string;

  @Column({
    type: "enum",
    enum: RelationshipStatus,
    default: RelationshipStatus.PENDING,
  })
  status: RelationshipStatus;

  @Column({ name: "initiated_by" })
  initiatedBy: string; // email của người gửi lời mời kết bạn

  @Column({ type: "text", nullable: true })
  message: string; // Tin nhắn kèm theo lời mời kết bạn

  @Column({ name: "accepted_at", type: "timestamp", nullable: true })
  acceptedAt: Date;

  @Column({ name: "blocked_at", type: "timestamp", nullable: true })
  blockedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations removed - using email directly instead of foreign keys
}
