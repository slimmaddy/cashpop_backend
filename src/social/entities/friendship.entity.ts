import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  REJECTED = 'rejected',
}

@Entity('friendships')
@Index(['userId', 'friendId'], { unique: true })
@Index(['userId', 'status'])
@Index(['status', 'createdAt'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'friend_id' })
  friendId: string;

  @Column({
    type: 'enum',
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status: FriendshipStatus;

  @Column({ name: 'initiated_by' })
  initiatedBy: string; // userId của người gửi lời mời kết bạn

  @Column({ type: 'text', nullable: true })
  message: string; // Tin nhắn kèm theo lời mời kết bạn

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'blocked_at', type: 'timestamp', nullable: true })
  blockedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.friendships)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'friend_id' })
  friend: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiated_by' })
  initiator: User;
}
