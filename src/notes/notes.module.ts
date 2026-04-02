import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { SharedModule } from 'src/common/shared.module';
import { ActivityLogsModule } from 'src/activity-logs/activity-logs.module';

@Module({
  imports: [SharedModule, ActivityLogsModule, TypeOrmModule.forFeature([Note, Customer])],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
