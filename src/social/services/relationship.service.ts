import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { User } from '../../users/entities/user.entity';
import {
  RelationshipResponseDto,
  GetFriendsDto,
} from '../dto/relationship.dto';

@Injectable()
export class RelationshipService {
  constructor(
    @InjectRepository(Relationship)
    private relationshipRepository: Repository<Relationship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Lấy danh sách bạn bè đã kết bạn của user
   * Logic đơn giản: chỉ lấy những relationship có status = ACCEPTED
   */
  async getFriends(
    userId: string,
    query: GetFriendsDto
  ): Promise<{ friends: RelationshipResponseDto[]; total: number }> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    // Query đơn giản: chỉ lấy relationship đã accepted
    const queryBuilder = this.relationshipRepository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.friend', 'friend')
      .where('relationship.userId = :userId AND relationship.status = :status', {
        userId,
        status: RelationshipStatus.ACCEPTED
      });

    // Tìm kiếm theo tên hoặc username của friend
    if (search) {
      queryBuilder.andWhere(
        '(friend.name ILIKE :search OR friend.username ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Sắp xếp và phân trang
    queryBuilder
      .orderBy('relationship.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [relationships, total] = await queryBuilder.getManyAndCount();

    // Transform data thành format cần thiết cho frontend
    const friends: RelationshipResponseDto[] = relationships.map(relationship => ({
      id: relationship.id,
      friend: {
        id: relationship.friend.id,
        email: relationship.friend.email,        // ✅ Email là primary identifier
        username: relationship.friend.username,  // ✅ Username luôn có (not null)
        name: relationship.friend.name,          // ✅ Tên hiển thị
        avatar: relationship.friend.avatar,      // ✅ Avatar có thể null
      },
      status: relationship.status,
      initiatedBy: relationship.initiatedBy,
      message: relationship.message,
      createdAt: relationship.createdAt,
      acceptedAt: relationship.acceptedAt,
    }));

    return { friends, total };
  }
}