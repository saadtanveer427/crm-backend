import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  findAll(@CurrentUser() currentUser: User) {
    return this.organizationService.findAll(currentUser);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationService.findOne(id, currentUser);
  }
}
