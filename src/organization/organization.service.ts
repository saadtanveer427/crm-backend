import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from 'src/common/enum';
import { User } from 'src/users/entities/user.entity';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  // Admin sees all organizations; member sees only their own
  async findAll(currentUser: User) {
    if (currentUser.role === UserRole.ADMIN) {
      return this.organizationsRepository.find({
        order: { createdAt: 'ASC' },
      });
    }

    return this.organizationsRepository.find({
      where: { id: currentUser.organizationId as string },
    });
  }

  async findOne(id: string, currentUser: User) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.organizationId !== id) {
      throw new ForbiddenException('You can only view your own organization.');
    }

    return this.organizationsRepository.findOne({ where: { id } });
  }
}
