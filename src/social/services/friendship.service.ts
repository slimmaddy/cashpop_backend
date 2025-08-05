import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friendship, FriendshipStatus } from '../entities/friendship.entity';
import { User } from '../../users/entities/user.entity';
import {
  FriendshipResponseDto,
  GetFriendsDto,
} from '../dto/friendship.dto';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Lấy danh sách bạn bè đã kết bạn của user
   * Logic đơn giản: chỉ lấy những friendship có status = ACCEPTED
   */
  async getFriends(
    userId: string,
    query: GetFriendsDto
  ): Promise<{ friends: FriendshipResponseDto[]; total: number }> {
    console.log('🔍 getFriends called with:', { userId, query });

    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    // Query đơn giản: chỉ lấy friendship đã accepted
    const queryBuilder = this.friendshipRepository
      .createQueryBuilder('friendship')
      .leftJoinAndSelect('friendship.friend', 'friend')
      .where('friendship.userId = :userId AND friendship.status = :status', {
        userId,
        status: FriendshipStatus.ACCEPTED
      });

    console.log('📋 Query parameters:', { userId, status: FriendshipStatus.ACCEPTED });

    // Tìm kiếm theo tên hoặc username của friend
    if (search) {
      queryBuilder.andWhere(
        '(friend.name ILIKE :search OR friend.username ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Sắp xếp và phân trang
    queryBuilder
      .orderBy('friendship.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    console.log('🔍 Executing query...');
    const [friendships, total] = await queryBuilder.getManyAndCount();
    console.log('📊 Query results:', { friendshipsCount: friendships.length, total });

    if (friendships.length > 0) {
      console.log('📋 Sample friendship:', friendships[0]);
    }

    // Transform data thành format cần thiết cho frontend
    const friends: FriendshipResponseDto[] = friendships.map(friendship => ({
      id: friendship.id,
      friend: {
        id: friendship.friend.id,
        email: friendship.friend.email,        // ✅ Email là primary identifier
        username: friendship.friend.username,  // ✅ Username luôn có (not null)
        name: friendship.friend.name,          // ✅ Tên hiển thị
        avatar: friendship.friend.avatar,      // ✅ Avatar có thể null
      },
      status: friendship.status,
      initiatedBy: friendship.initiatedBy,
      message: friendship.message,
      createdAt: friendship.createdAt,
      acceptedAt: friendship.acceptedAt,
    }));

    console.log('✅ Returning result:', { friendsCount: friends.length, total });
    return { friends, total };
  }
}