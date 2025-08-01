import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, AuthProvider } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileResponseDto } from "./dto/profile-response.dto";
import { plainToInstance } from "class-transformer";
import { FileUploadService } from "../file-upload/file-upload.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly fileUploadService: FileUploadService
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if email already exists
    const existingUserByEmail = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException("Email already exists");
    }

    // Check if username already exists
    const existingUserByUsername = await this.usersRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException("Username already exists");
    }

    const user = this.usersRepository.create(createUserDto);
    
    // Set refreshTokenCreatedAt if a refresh token is provided
    if (createUserDto.refreshToken) {
      user.refreshTokenCreatedAt = new Date();
    }
    
    return this.usersRepository.save(user);
  }

  async createFacebookUser(email: string, providerId: string, name: string): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    // Generate a username based on the email (before the @ symbol)
    let baseUsername = email.split('@')[0];
    let username = baseUsername;
    let counter = 1;

    // Check if username exists, if so, append a number
    while (await this.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const user = this.usersRepository.create({
      email,
      username,
      name,
      providerId,
      provider: AuthProvider.FACEBOOK,
    });

    return this.usersRepository.save(user);
  }

  async createLineUser(email: string, providerId: string, name: string): Promise<User> {
    // Check if user already exists by providerId for Line users (since email is placeholder)
    const existingUserByProviderId = await this.usersRepository.findOne({
      where: { providerId, provider: AuthProvider.LINE },
    });

    if (existingUserByProviderId) {
      throw new ConflictException("Line user already exists");
    }

    // For Line users, also check by email in case it's a real email
    if (!email.includes('line.placeholder')) {
      const existingUser = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException("Email already exists");
      }
    }

    // Generate a username based on Line ID or name
    let baseUsername = name ? name.toLowerCase().replace(/\s+/g, '_') : `line_${providerId.substring(0, 8)}`;
    let username = baseUsername;
    let counter = 1;

    // Check if username exists, if so, append a number
    while (await this.findByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const user = this.usersRepository.create({
      email,
      username,
      name,
      providerId,
      provider: AuthProvider.LINE,
    });

    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findByProviderId(providerId: string, provider: AuthProvider): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { providerId, provider } 
    });
  }

  async updateProviderId(userId: string, providerId: string): Promise<void> {
    await this.usersRepository.update(userId, { providerId });
  }

  async setRefreshToken(
    userId: string,
    refreshToken: string | null
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    user.refreshToken = refreshToken;
    // Set the refresh token creation timestamp when a new token is set
    // Set to null when the refresh token is removed (during logout)
    user.refreshTokenCreatedAt = refreshToken ? new Date() : null;
    await this.usersRepository.save(user);
  }

  /**
   * Update user's password
   * @param email User's email
   * @param newPassword New password
   * @returns Updated user
   */
  async updatePassword(email: string, newPassword: string): Promise<User> {
    const user = await this.findByEmail(email);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update password
    user.password = newPassword;
    
    // Save user with updated password
    // The password will be automatically hashed by the entity's BeforeUpdate hook
    return this.usersRepository.save(user);
  }

  /**
   * Update user's profile
   * @param userId User's ID
   * @param updateProfileDto Profile data to update
   * @param file Optional avatar file to upload
   * @returns Updated user profile
   */
  async updateProfile(
    userId: string, 
    updateProfileDto: UpdateProfileDto,
    file?: Express.Multer.File
  ): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If file is provided, upload it and update the avatar URL
    if (file) {
      const avatarUrl = await this.fileUploadService.uploadFile(file, 'avatars');
      updateProfileDto.avatar = avatarUrl;
    }

    // Update only the fields that are provided
    Object.keys(updateProfileDto).forEach(key => {
      if (updateProfileDto[key] !== undefined) {
        user[key] = updateProfileDto[key];
      }
    });
    
    // Save the updated user
    const updatedUser = await this.usersRepository.save(user);
    
    // Transform to ProfileResponseDto to exclude sensitive data
    return plainToInstance(ProfileResponseDto, updatedUser);
  }

  /**
   * Get user's profile
   * @param userId User's ID
   * @returns User profile
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Transform to ProfileResponseDto to exclude sensitive data
    return plainToInstance(ProfileResponseDto, user);
  }
}
