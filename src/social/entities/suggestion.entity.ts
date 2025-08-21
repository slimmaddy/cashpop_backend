import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  @Column()
  userEmail: string

  @Column()
  suggestedUserEmail: string

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

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date;

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.receivedSuggestions)
  @JoinColumn({ name: 'userEmail', referencedColumnName: 'email' })
  user: User;

  @ManyToOne(() => User, (user) => user.givenSuggestions)
  @JoinColumn({ name: 'suggestedUserEmail', referencedColumnName: 'email' })
  suggestedUser: User;
}
