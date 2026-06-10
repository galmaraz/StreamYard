import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

import { UserRole } from '../user-role.enum';

const persistedUserRoles = [UserRole.Admin, UserRole.Host, UserRole.Viewer];

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  displayName?: string;

  @IsOptional()
  @IsIn(persistedUserRoles)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
