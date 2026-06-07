import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { hash } from 'bcryptjs';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './user-role.enum';
import { UserResponse, toUserResponse } from './user-response.type';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    const user = await this.usersService.create({
      email: createUserDto.email,
      passwordHash: await hash(createUserDto.password, 12),
      displayName: createUserDto.displayName,
      role: createUserDto.role,
      isActive: createUserDto.isActive,
    });

    return toUserResponse(user);
  }

  @Get()
  async findAll(): Promise<UserResponse[]> {
    const users = await this.usersService.findAll();

    return users.map(toUserResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponse> {
    return toUserResponse(await this.usersService.findByIdOrFail(id));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.usersService.update(id, {
      email: updateUserDto.email,
      passwordHash: updateUserDto.password
        ? await hash(updateUserDto.password, 12)
        : undefined,
      displayName: updateUserDto.displayName,
      role: updateUserDto.role,
      isActive: updateUserDto.isActive,
    });

    return toUserResponse(user);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<UserResponse> {
    return toUserResponse(await this.usersService.deactivate(id));
  }

  @Delete(':id')
  delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
}
