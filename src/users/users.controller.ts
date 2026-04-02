import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @CurrentUser() requestingUser: User,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(requestingUser, createUserDto);
  }

  @Get()
  findAll(@CurrentUser() requestingUser: User) {
    return this.usersService.findAll(requestingUser);
  }

  @Get(':id')
  findOne(
    @CurrentUser() requestingUser: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(requestingUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() requestingUser: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(requestingUser, id, updateUserDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() requestingUser: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(requestingUser, id);
  }
}
