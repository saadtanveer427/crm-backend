import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserRole, ActivityAction } from 'src/common/enum';
import { Customer } from 'src/customers/entities/customer.entity';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { handleDbError } from 'src/common/utils/db-error.util';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly notesRepository: Repository<Note>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(customerId: string, dto: CreateNoteDto, currentUser: User) {
    const customer = await this.customersRepository.findOne({
      where: { id: customerId, organizationId: currentUser.organizationId as string },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${customerId}" was not found.`);
    }

    const note = this.notesRepository.create({
      content: dto.content,
      customerId,
      organizationId: currentUser.organizationId as string,
      createdById: currentUser.id,
    });

    const saved = await this.notesRepository.save(note).catch((e) => handleDbError(e, 'note'));

    await this.activityLogsService.log(ActivityAction.NOTE_ADDED, 'note', saved.id, currentUser);

    return saved;
  }

  async remove(noteId: string, currentUser: User) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId, organizationId: currentUser.organizationId as string },
    });

    if (!note) {
      throw new NotFoundException(`Note with id "${noteId}" was not found.`);
    }

    if (currentUser.role === UserRole.MEMBER && note.createdById !== currentUser.id) {
      throw new ForbiddenException('You can only delete your own notes.');
    }

    await this.notesRepository.softRemove(note);
    return { message: `Note with id "${noteId}" deleted successfully.` };
  }
}
