import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from '../entities/relationship.entity';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import {
  RelationshipResponseDto,
  GetFriendsDto,
  SendFriendRequestDto,
  SendFriendRequestResponseDto,
  FriendRequestDto,
  GetFriendRequestsDto,
  FriendRequestActionResponseDto,
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

  /**
   * Gửi lời mời kết bạn
   */
  async sendFriendRequest(
    senderEmail: string,
    sendFriendRequestDto: SendFriendRequestDto
  ): Promise<SendFriendRequestResponseDto> {
    const { friendEmail, message } = sendFriendRequestDto;

    // 1. Validation: Không thể gửi lời mời cho chính mình
    if (senderEmail === friendEmail) {
      throw new BadRequestException('Không thể gửi lời mời kết bạn cho chính mình');
    }

    // 2. Kiểm tra user người nhận có tồn tại không
    const friendUser = await this.usersService.findByEmail(friendEmail);
    if (!friendUser) {
      throw new NotFoundException('Không tìm thấy người dùng với email này');
    }

    // 3. Kiểm tra mối quan hệ đã tồn tại chưa
    const existingRelationship = await this.checkExistingRelationship(senderEmail, friendEmail);
    if (existingRelationship) {
      switch (existingRelationship.status) {
        case RelationshipStatus.ACCEPTED:
          throw new ConflictException('Bạn đã là bạn bè với người này rồi');
        case RelationshipStatus.PENDING:
          throw new ConflictException('Lời mời kết bạn đã được gửi trước đó');
        case RelationshipStatus.BLOCKED:
          throw new ConflictException('Không thể gửi lời mời kết bạn');
        case RelationshipStatus.REJECTED:
          // Cho phép gửi lại sau khi bị từ chối
          break;
      }
    }

    // 4. Tạo hoặc cập nhật relationship
    let relationship: Relationship;
    
    if (existingRelationship && existingRelationship.status === RelationshipStatus.REJECTED) {
      // Cập nhật relationship cũ
      existingRelationship.status = RelationshipStatus.PENDING;
      existingRelationship.initiatedBy = senderEmail;
      existingRelationship.message = message || null;
      existingRelationship.acceptedAt = null;
      existingRelationship.blockedAt = null;
      relationship = await this.relationshipRepository.save(existingRelationship);

      // ✅ FIX #5: Tìm và cập nhật reverse relationship cũ
      const oldReverseRelationship = await this.relationshipRepository.findOne({
        where: {
          userEmail: friendEmail,
          friendEmail: senderEmail,
          status: RelationshipStatus.REJECTED,
        }
      });
      
      if (oldReverseRelationship) {
        oldReverseRelationship.status = RelationshipStatus.RECEIVED;
        oldReverseRelationship.initiatedBy = senderEmail;
        oldReverseRelationship.message = message || null;
        oldReverseRelationship.acceptedAt = null;
        oldReverseRelationship.blockedAt = null;
        await this.relationshipRepository.save(oldReverseRelationship);
      } else {
        // Nếu không tìm thấy reverse relationship cũ, tạo mới
        const newReverseRelationship = this.relationshipRepository.create({
          userEmail: friendEmail,
          friendEmail: senderEmail,
          status: RelationshipStatus.RECEIVED,
          initiatedBy: senderEmail,
          message: message || null,
        });
        await this.relationshipRepository.save(newReverseRelationship);
      }
    } else {
      // Tạo relationship mới
      relationship = this.relationshipRepository.create({
        userEmail: senderEmail,
        friendEmail: friendEmail,
        status: RelationshipStatus.PENDING,
        initiatedBy: senderEmail,
        message: message || null,
      });
      relationship = await this.relationshipRepository.save(relationship);

      // 5. Tạo relationship ngược lại (bidirectional)
      const reverseRelationship = this.relationshipRepository.create({
        userEmail: friendEmail,
        friendEmail: senderEmail,
        status: RelationshipStatus.RECEIVED,
        initiatedBy: senderEmail,
        message: message || null,
      });
      await this.relationshipRepository.save(reverseRelationship);
    }

    return {
      success: true,
      message: 'Lời mời kết bạn đã được gửi thành công',
      relationship: {
        id: relationship.id,
        friend: {
          id: friendUser.id,
          email: friendUser.email,
          username: friendUser.username,
          name: friendUser.name,
          avatar: friendUser.avatar,
        },
        status: relationship.status,
        initiatedBy: relationship.initiatedBy,
        message: relationship.message,
        createdAt: relationship.createdAt,
        acceptedAt: relationship.acceptedAt,
      },
    };
  }

  /**
   * Kiểm tra mối quan hệ đã tồn tại
   */
  private async checkExistingRelationship(
    userEmail: string,
    friendEmail: string
  ): Promise<Relationship | null> {
    return await this.relationshipRepository.findOne({
      where: [
        { userEmail, friendEmail },
      ],
    });
  }
  
  /**
   * Lấy danh sách lời mời kết bạn đã nhận
   */
  async getFriendRequests(
    userEmail: string,
    query: GetFriendRequestsDto
  ): Promise<{ requests: FriendRequestDto[]; total: number }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Tìm những relationship mà user là người nhận và status = PENDING
    const [relationships, total] = await this.relationshipRepository.findAndCount({
    where: {
      friendEmail: userEmail, // ✅ User hiện tại là người nhận lời mời
      status: RelationshipStatus.PENDING,
    },
    order: {
      createdAt: 'DESC',
    },
    take: limit,
    skip,
  });

    console.log('🔍 Debug getFriendRequests:');
    console.log('- userEmail:', userEmail);
    console.log('- requests found:', relationships.length);
    console.log('- total:', total);

    // Transform data thành format cần thiết cho frontend
    const requests: FriendRequestDto[] = await Promise.all(
      relationships.map(async (relationship) => {
        // Lấy thông tin sender từ email
        const senderUser = await this.usersService.findByEmail(relationship.userEmail);
        console.log(`- Finding sender: ${relationship.userEmail} -> ${senderUser ? 'Found' : 'Not found'}`);

        return {
          id: relationship.id,
          sender: {
            id: senderUser?.id || '',
            email: relationship.userEmail,
            username: senderUser?.username || '',
            name: senderUser?.name || '',
            avatar: senderUser?.avatar || null,
          },
          message: relationship.message,
          createdAt: relationship.createdAt,
          canAccept: true,
          canReject: true,
        };
      })
    );

    return { requests, total };
  }

  /**
   * Chấp nhận lời mời kết bạn
   */
  async acceptFriendRequest(
    userEmail: string,
    requestId: string
  ): Promise<FriendRequestActionResponseDto> {

    // Kiểm tra xem lời mời có tồn tại không và vẫn còn PENDING
    const currentRelationship = await this.relationshipRepository.findOne({
      where: { id: requestId }
    });
    
    if (!currentRelationship || currentRelationship.status !== RelationshipStatus.PENDING) {
      throw new ConflictException('Lời mời đã được xử lý hoặc không tồn tại');
    }
    
    // 1. Tìm relationship request
    const relationship = await this.relationshipRepository.findOne({
      where: {
        id: requestId,
        friendEmail: userEmail, // Đảm bảo user hiện tại là người nhận
        status: RelationshipStatus.PENDING,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý');
    }

    // 2. Cập nhật relationship thành ACCEPTED
    relationship.status = RelationshipStatus.ACCEPTED;
    relationship.acceptedAt = new Date();
    const updatedRelationship = await this.relationshipRepository.save(relationship);

    // 3. Cập nhật relationship ngược lại (bidirectional)
    const reverseRelationship = await this.relationshipRepository.findOne({
      where: {
        userEmail: relationship.userEmail,
        friendEmail: userEmail,
      },
    });

    if (reverseRelationship) {
      reverseRelationship.status = RelationshipStatus.ACCEPTED;
      reverseRelationship.acceptedAt = new Date();
      await this.relationshipRepository.save(reverseRelationship);
    }

    // 4. Lấy thông tin sender để return
    const senderUser = await this.usersService.findByEmail(relationship.userEmail);

    return {
      success: true,
      message: 'Đã chấp nhận lời mời kết bạn',
      relationship: {
        id: updatedRelationship.id,
        friend: {
          id: senderUser?.id || '',
          email: senderUser?.email || relationship.userEmail,
          username: senderUser?.username || '',
          name: senderUser?.name || '',
          avatar: senderUser?.avatar || null,
        },
        status: updatedRelationship.status,
        initiatedBy: updatedRelationship.initiatedBy,
        message: updatedRelationship.message,
        createdAt: updatedRelationship.createdAt,
        acceptedAt: updatedRelationship.acceptedAt,
      },
    };
  }

  /**
   * Từ chối lời mời kết bạn
   */
  async rejectFriendRequest(
    userEmail: string,
    requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    // 1. Tìm relationship request
    const relationship = await this.relationshipRepository.findOne({
      where: {
        id: requestId,
        friendEmail: userEmail, // Đảm bảo user hiện tại là người nhận
        status: RelationshipStatus.PENDING,
      },
    });

    if (!relationship) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý');
    }

    // 2. Cập nhật relationship thành REJECTED
    relationship.status = RelationshipStatus.REJECTED;
    await this.relationshipRepository.save(relationship);

    // 3. Cập nhật relationship ngược lại
    const reverseRelationship = await this.relationshipRepository.findOne({
      where: {
        userEmail: userEmail,
        friendEmail: relationship.userEmail,
      },
    });

    if (reverseRelationship) {
      reverseRelationship.status = RelationshipStatus.REJECTED;
      await this.relationshipRepository.save(reverseRelationship);
    }

    return {
      success: true,
      message: 'Đã từ chối lời mời kết bạn',
      requestId: requestId,
    };
  }
}