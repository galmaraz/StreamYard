import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../user-role.enum';

const persistedUserRoles = [UserRole.Admin, UserRole.Host, UserRole.Viewer];

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsIn(persistedUserRoles)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
