import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ActivityAction } from 'src/common/enum';

export class CreateActivityLogDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsEnum(ActivityAction)
  action: ActivityAction;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsUUID()
  organizationId: string;

}
