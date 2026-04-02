import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from 'src/common/enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { handleDbError } from 'src/common/utils/db-error.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // Only admins can create users within their organization
  async create(requestingUser: User, createUserDto: CreateUserDto) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create users.');
    }

    const existing = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      organizationId: createUserDto.organizationId,
    });
    return this.usersRepository.save(user).catch((e) => handleDbError(e, 'user'));
  }

  // Admins see all users in their org; members see only themselves
  async findAll(requestingUser: User) {
    if (requestingUser.role === UserRole.ADMIN) {
      return this.usersRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    return this.usersRepository.find({
      where: { id: requestingUser.id, organizationId: requestingUser.organizationId as string },
    });
  }

  async findOne(requestingUser: User, id: string) {
    const where =
      requestingUser.role === UserRole.ADMIN ? { id } : { id, organizationId: requestingUser.organizationId as string };

    const user = await this.usersRepository.findOne({ where });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    // Members can only view their own profile
    if (requestingUser.role === UserRole.MEMBER && requestingUser.id !== id) {
      throw new ForbiddenException('You can only view your own profile.');
    }

    return user;
  }

  // Admins can update any user in their org; members can only update themselves
  async update(requestingUser: User, id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(requestingUser, id);

    if (requestingUser.role === UserRole.MEMBER && requestingUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile.');
    }

    // Only admins can change roles
    if (updateUserDto.role !== undefined && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles.');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existing) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user).catch((e) => handleDbError(e, 'user'));
  }

  // Only admins can delete users
  async remove(requestingUser: User, id: string) {
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete users.');
    }

    if (requestingUser.id === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    await this.usersRepository.softRemove(user);
    return { message: `User with id "${id}" deleted successfully.` };
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }
}
