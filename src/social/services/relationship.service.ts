import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
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
    private usersService: UsersService,
  ) {}

  /**
   * Lấy danh sách bạn bè đã kết bạn của user
   * Logic đơn giản: chỉ lấy những relationship có status = ACCEPTED
   */
  async getFriends(
    userEmail: string,
    query: GetFriendsDto
  ): Promise<{ friends: RelationshipResponseDto[]; total: number }> {
    // Tìm user từ email
    const currentUser = await this.usersService.findByEmail(userEmail);
    if (!currentUser) {
      return { friends: [], total: 0 };
    }

    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    // Query đơn giản: chỉ lấy relationship đã accepted
    const queryBuilder = this.relationshipRepository
      .createQueryBuilder('relationship')
      .where('relationship.userEmail = :userEmail AND relationship.status = :status', {
        userEmail,
        status: RelationshipStatus.ACCEPTED
      });

    // Tìm kiếm theo email của friend
    if (search) {
      queryBuilder.andWhere(
        'relationship.friendEmail ILIKE :search',
        { search: `%${search}%` }
      );
    }

    // Sắp xếp và phân trang
    queryBuilder
      .orderBy('relationship.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [relationships, total] = await queryBuilder.getManyAndCount();

    console.log('🔍 Debug RelationshipService:');
    console.log('- user_email:', userEmail);
    console.log('- relationships found:', relationships.length);
    console.log('- total:', total);
    console.log('- sample relationship:', relationships[0]);

    // Transform data thành format cần thiết cho frontend
    const friends: RelationshipResponseDto[] = await Promise.all(
      relationships.map(async (relationship) => {
        // Lấy thông tin friend từ email
        const friendUser = await this.usersService.findByEmail(relationship.friendEmail);
        console.log(`- Finding friend: ${relationship.friendEmail} -> ${friendUser ? 'Found' : 'Not found'}`);

        return {
          id: relationship.id,
          friend: {
            id: friendUser?.id || '',
            email: relationship.friendEmail,        // ✅ Email từ relationship
            username: friendUser?.username || '',   // ✅ Username từ user
            name: friendUser?.name || '',           // ✅ Tên từ user
            avatar: friendUser?.avatar || null,     // ✅ Avatar từ user
          },
          status: relationship.status,
          initiatedBy: relationship.initiatedBy,
          message: relationship.message,
          createdAt: relationship.createdAt,
          acceptedAt: relationship.acceptedAt,
        };
      })
    );

    return { friends, total };
  }
}