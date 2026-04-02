import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { JWTUser } from 'src/common/interface';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  create(@CurrentUser() currentUser: JWTUser, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto, currentUser);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: JWTUser,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const query: ListCustomersQueryDto = {
      organizationId: currentUser.organizationId ?? undefined,
      search,
      page,
      limit,
    };
    return this.customersService.findAll(query, currentUser);
  }

  @Get('deleted')
  findDeleted(
    @CurrentUser() currentUser: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.customersService.findDeleted(currentUser, page, limit);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto, currentUser);
  }

  @Delete(':id')
  remove(@CurrentUser() currentUser: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.remove(id, currentUser);
  }

  @Post(':id/restore')
  restore(@CurrentUser() currentUser: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.restore(id, currentUser);
  }
}
