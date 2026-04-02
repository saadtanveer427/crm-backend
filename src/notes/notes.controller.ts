import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

// Notes are always accessed in the context of a customer:
//   POST  /customers/:customerId/notes        → create a note
//   DELETE /customers/:customerId/notes/:id   → delete a note
@UseGuards(JwtAuthGuard)
@Controller('customers/:customerId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() createNoteDto: CreateNoteDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.notesService.create(customerId, createNoteDto, currentUser);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.notesService.remove(id, currentUser);
  }
}
