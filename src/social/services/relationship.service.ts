import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import {
  FriendshipAlreadyExistsException,
  FriendRequestNotFoundException,
  SelfFriendshipException,
  RelationshipActionNotAllowedException,
} from "../exceptions/social.exceptions";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Relationship,
  RelationshipStatus,
} from "../entities/relationship.entity";
import { User } from "../../users/entities/user.entity";
import { UsersService } from "../../users/users.service";
import { UserContextService } from "./user-context.service";
import { RelationshipRepository } from "../repositories/relationship.repository";
import {
  RelationshipResponseDto,
  GetFriendsDto,
  SendFriendRequestDto,
  SendFriendRequestResponseDto,
  FriendRequestDto,
  GetFriendRequestsDto,
  FriendRequestActionResponseDto,
} from "../dto/relationship.dto";

@Injectable()
export class RelationshipService {
  constructor(
    @InjectRepository(Relationship)
    private relationshipRepository: Repository<Relationship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private usersService: UsersService,
    private userContextService: UserContextService,
    public relationshipRepositoryCustom: RelationshipRepository,
    private dataSource: DataSource
  ) {}

  /**
   * ✅ OPTIMIZED: Lấy danh sách bạn bè sử dụng custom repository
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

    // Use custom repository method
    const { data, total } = await this.relationshipRepositoryCustom.findFriendsWithUserData(
      userEmail,
      page,
      limit,
      search
    );

    // Transform data
    const friends: RelationshipResponseDto[] = data.map((row) => ({
      id: row.relationship_id,
      friend: {
        id: row.friend_id || "",
        email: row.relationship_friendemail,
        username: row.friend_username || "",
        name: row.friend_name || "",
        avatar: row.friend_avatar || null,
      },
      status: row.relationship_status,
      initiatedBy: row.relationship_initiatedby,
      message: row.relationship_message,
      createdAt: row.relationship_createdat,
      acceptedAt: row.relationship_acceptedat,
    }));

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

    // 1. ✅ OPTIMIZED: Validation với custom exception
    if (senderEmail === friendEmail) {
      throw new SelfFriendshipException(senderEmail);
    }

    // 2. Kiểm tra user người nhận có tồn tại không
    const friendUser = await this.usersService.findByEmail(friendEmail);
    if (!friendUser) {
      throw new NotFoundException("Không tìm thấy người dùng với email này");
    }

    // 3. Kiểm tra mối quan hệ đã tồn tại chưa
    const existingRelationship = await this.checkExistingRelationship(
      senderEmail,
      friendEmail
    );
    if (existingRelationship) {
      switch (existingRelationship.status) {
        case RelationshipStatus.ACCEPTED:
        case RelationshipStatus.PENDING:
        case RelationshipStatus.BLOCKED:
          throw new FriendshipAlreadyExistsException(senderEmail, friendEmail);
        case RelationshipStatus.REJECTED:
          // Cho phép gửi lại sau khi bị từ chối
          break;
      }
    }

    // 4. Tạo hoặc cập nhật relationship
    let relationship: Relationship;

    if (
      existingRelationship &&
      existingRelationship.status === RelationshipStatus.REJECTED
    ) {
      // Cập nhật relationship cũ
      existingRelationship.status = RelationshipStatus.PENDING;
      existingRelationship.initiatedBy = senderEmail;
      existingRelationship.message = message || null;
      existingRelationship.acceptedAt = null;
      existingRelationship.blockedAt = null;
      relationship = await this.relationshipRepository.save(
        existingRelationship
      );

      // ✅ FIX #5: Tìm và cập nhật reverse relationship cũ
      const oldReverseRelationship = await this.relationshipRepository.findOne({
        where: {
          userEmail: friendEmail,
          friendEmail: senderEmail,
          status: RelationshipStatus.REJECTED,
        },
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
      message: "Lời mời kết bạn đã được gửi thành công",
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
   * Kiểm tra mối quan hệ đã tồn tại (public method để các service khác sử dụng)
   */
  async checkExistingRelationship(
    userEmail: string,
    friendEmail: string
  ): Promise<Relationship | null> {
    return await this.relationshipRepository.findOne({
      where: [{ userEmail, friendEmail }],
    });
  }

  /**
   * Kiểm tra mối quan hệ bidirectional (cả 2 chiều)
   */
  async checkBidirectionalRelationship(
    userEmail: string,
    friendEmail: string
  ): Promise<{ primary: Relationship | null; reverse: Relationship | null }> {
    const [primary, reverse] = await Promise.all([
      this.relationshipRepository.findOne({
        where: { userEmail, friendEmail },
      }),
      this.relationshipRepository.findOne({
        where: { userEmail: friendEmail, friendEmail: userEmail },
      }),
    ]);

    return { primary, reverse };
  }

  /**
   * Tạo friendship tự động chấp nhận (dùng cho sync)
   */
  async createAutoAcceptedFriendship(
    userEmail: string,
    friendEmail: string,
    message: string
  ): Promise<{
    created: boolean;
    message: string;
    relationship?: Relationship;
  }> {
    // Kiểm tra relationship đã tồn tại
    const { primary, reverse } = await this.checkBidirectionalRelationship(
      userEmail,
      friendEmail
    );

    // Nếu đã là bạn
    if (
      primary?.status === RelationshipStatus.ACCEPTED ||
      reverse?.status === RelationshipStatus.ACCEPTED
    ) {
      return { created: false, message: "Already friends" };
    }

    // Nếu có pending request
    if (
      primary?.status === RelationshipStatus.PENDING ||
      primary?.status === RelationshipStatus.RECEIVED ||
      reverse?.status === RelationshipStatus.PENDING ||
      reverse?.status === RelationshipStatus.RECEIVED
    ) {
      return { created: false, message: "Pending request exists" };
    }

    // ✅ OPTIMIZED: Use transaction for atomic friendship creation
    return await this.dataSource.transaction(async manager => {
      const now = new Date();

      // Tạo hoặc cập nhật primary relationship
      let primaryRelationship: Relationship;
      if (primary) {
        await manager.update(Relationship, { id: primary.id }, {
          status: RelationshipStatus.ACCEPTED,
          initiatedBy: userEmail,
          message,
          acceptedAt: now,
          blockedAt: null,
        });
        primaryRelationship = await manager.findOne(Relationship, { where: { id: primary.id } });
      } else {
        const newPrimary = manager.create(Relationship, {
          userEmail,
          friendEmail,
          status: RelationshipStatus.ACCEPTED,
          initiatedBy: userEmail,
          message,
          acceptedAt: now,
        });
        primaryRelationship = await manager.save(newPrimary);
      }

      // Tạo hoặc cập nhật reverse relationship
      if (reverse) {
        await manager.update(Relationship, { id: reverse.id }, {
          status: RelationshipStatus.ACCEPTED,
          initiatedBy: userEmail,
          message,
          acceptedAt: now,
          blockedAt: null,
        });
      } else {
        const newReverse = manager.create(Relationship, {
          userEmail: friendEmail,
          friendEmail: userEmail,
          status: RelationshipStatus.ACCEPTED,
          initiatedBy: userEmail,
          message,
          acceptedAt: now,
        });
        await manager.save(newReverse);
      }

      return {
        created: true,
        message: "Friendship created successfully",
        relationship: primaryRelationship,
      };
    });
  }

  /**
   * ✅ OPTIMIZED: Lấy danh sách lời mời kết bạn sử dụng custom repository
   */
  async getFriendRequests(
    userEmail: string,
    query: GetFriendRequestsDto
  ): Promise<{ requests: FriendRequestDto[]; total: number }> {
    const { page = 1, limit = 20 } = query;

    // Use custom repository method
    const { data, total } = await this.relationshipRepositoryCustom.findFriendRequestsWithUserData(
      userEmail,
      page,
      limit
    );

    // Transform data
    const requests: FriendRequestDto[] = data.map((row) => ({
      id: row.relationship_id,
      sender: {
        id: row.friend_id || "",
        email: row.relationship_useremail,
        username: row.friend_username || "",
        name: row.friend_name || "",
        avatar: row.friend_avatar || null,
      },
      message: row.relationship_message,
      createdAt: row.relationship_createdat,
      canAccept: true,
      canReject: true,
    }));

    return { requests, total };
  }

  /**
   * ✅ OPTIMIZED: Chấp nhận lời mời kết bạn với transaction
   */
  async acceptFriendRequest(
    userEmail: string,
    requestId: string
  ): Promise<FriendRequestActionResponseDto> {
    return await this.dataSource.transaction(async manager => {
      // 1. Tìm và lock relationship request
      const relationship = await manager.findOne(Relationship, {
        where: {
          id: requestId,
          friendEmail: userEmail, // Đảm bảo user hiện tại là người nhận
          status: RelationshipStatus.PENDING,
        },
        lock: { mode: "pessimistic_write" }
      });

      if (!relationship) {
        throw new FriendRequestNotFoundException(requestId);
      }

      // 2. Update primary relationship
      await manager.update(Relationship, 
        { id: requestId }, 
        { 
          status: RelationshipStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      );

      // 3. Update reverse relationship (if exists)
      await manager.update(Relationship,
        { 
          userEmail: relationship.userEmail,
          friendEmail: userEmail
        },
        {
          status: RelationshipStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      );

      // 4. Get updated relationship
      const updatedRelationship = await manager.findOne(Relationship, {
        where: { id: requestId }
      });

      // 5. Get sender user info
      const senderUser = await this.userContextService.getUserByEmail(relationship.userEmail);

      return {
        success: true,
        message: "Đã chấp nhận lời mời kết bạn",
        relationship: {
          id: updatedRelationship.id,
          friend: {
            id: senderUser?.id || "",
            email: senderUser?.email || relationship.userEmail,
            username: senderUser?.username || "",
            name: senderUser?.name || "",
            avatar: senderUser?.avatar || null,
          },
          status: updatedRelationship.status,
          initiatedBy: updatedRelationship.initiatedBy,
          message: updatedRelationship.message,
          createdAt: updatedRelationship.createdAt,
          acceptedAt: updatedRelationship.acceptedAt,
        },
      };
    });
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
      throw new NotFoundException(
        "Không tìm thấy lời mời kết bạn hoặc lời mời đã được xử lý"
      );
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
      message: "Đã từ chối lời mời kết bạn",
      requestId: requestId,
    };
  }
}
