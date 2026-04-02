import { IsEmail, IsEnum, IsString, IsUUID } from 'class-validator';
import { UserRole } from 'src/common/enum';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsUUID()
  organizationId: string;
}
