import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityAction, UserRole } from 'src/common/enum';
import { User } from 'src/users/entities/user.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { ListActivityLogsQueryDto } from './dto/list-activity-logs-query.dto';
import { JWTUser } from 'src/common/interface';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogsRepository: Repository<ActivityLog>,
  ) {}

  // Internal method called by other services to record events
  async log(action: ActivityAction, entityType: string, entityId: string, currentUser: JWTUser): Promise<void> {
    const entry = this.activityLogsRepository.create({
      action,
      entityType,
      entityId,
      userId: currentUser.id,
      organizationId: currentUser.organizationId,
    });

    await this.activityLogsRepository.save(entry);
  }

  async findAll(currentUser: User, query: ListActivityLogsQueryDto) {
    const { entityType, entityId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.activityLogsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.performedBy', 'user')
      .orderBy('log.timestamp', 'DESC')
      .skip(skip)
      .take(limit);

    // Admin sees all orgs; members see only their own
    if (currentUser.role !== UserRole.ADMIN) {
      qb.andWhere('log.organizationId = :orgId', {
        orgId: currentUser.organizationId,
      });
    }

    if (entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
