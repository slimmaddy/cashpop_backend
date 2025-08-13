import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RelationshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
  REJECTED = 'rejected',
  RECEIVED = 'received',
}

@Entity('relationships')
@Index(['userEmail', 'friendEmail'], { unique: true })
@Index(['userEmail', 'status'])
@Index(['status', 'createdAt'])
export class Relationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userEmail' })
  userEmail: string;

  @Column({ name: 'friendEmail' })
  friendEmail: string;

  @Column({
    type: 'enum',
    enum: RelationshipStatus,
    default: RelationshipStatus.PENDING,
  })
  status: RelationshipStatus;

  @Column({ name: 'initiatedBy' })
  initiatedBy: string; // email của người gửi lời mời kết bạn

  @Column({ type: 'text', nullable: true })
  message: string; // Tin nhắn kèm theo lời mời kết bạn

  @Column({ name: 'acceptedAt', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'blockedAt', type: 'timestamp', nullable: true })
  blockedAt: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Relations removed - using email directly instead of foreign keys
}
