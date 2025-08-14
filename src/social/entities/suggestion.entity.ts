import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export enum SuggestionSource {
  CONTACT = "contact",
  FACEBOOK = "facebook",
  LINE = "line",
  MUTUAL_FRIENDS = "mutual_friends",
  SYSTEM = "system",
}

export enum SuggestionStatus {
  ACTIVE = "active",
  DISMISSED = "dismissed",
  FRIEND_REQUEST_SENT = "friend_request_sent",
}

@Entity("suggestions")
@Index(["userEmail", "suggestedUserEmail"], { unique: true })
@Index(["userEmail", "status"])
@Index(["status", "createdAt"])
export class Suggestion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_email" })
  userEmail: string;

  @Column({ name: "suggested_user_email" })
  suggestedUserEmail: string;

  @Column({
    type: "enum",
    enum: SuggestionSource,
    default: SuggestionSource.SYSTEM,
  })
  source: SuggestionSource;

  @Column({
    type: "enum",
    enum: SuggestionStatus,
    default: SuggestionStatus.ACTIVE,
  })
  status: SuggestionStatus;

  @Column({ type: "text", nullable: true })
  reason: string; // "You have 3 mutual friends"

  @Column({ type: "int", default: 0 })
  mutualFriendsCount: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: any; // Thông tin thêm (platform data, etc.)

  @Column({ name: "dismissed_at", type: "timestamp", nullable: true })
  dismissedAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.receivedSuggestions)
  @JoinColumn({ name: "user_email", referencedColumnName: "email" })
  user: User;

  @ManyToOne(() => User, (user) => user.givenSuggestions)
  @JoinColumn({ name: "suggested_user_email", referencedColumnName: "email" })
  suggestedUser: User;
}
