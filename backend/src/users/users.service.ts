import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { UserRole } from './user-role.enum';
import { User } from './user.entity';

type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName: string;
  role?: UserRole;
  isActive?: boolean;
};

type UpdateUserInput = {
  email?: string;
  passwordHash?: string;
  displayName?: string;
  role?: UserRole;
  isActive?: boolean;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(input: CreateUserInput): Promise<User> {
    this.assertPersistableRole(input.role);

    const existingUser = await this.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = this.usersRepository.create({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      role: input.role ?? UserRole.Host,
      isActive: input.isActive ?? true,
    });

    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    this.assertPersistableRole(input.role);

    const user = await this.findByIdOrFail(id);

    if (input.email !== undefined) {
      const normalizedEmail = input.email.toLowerCase();
      const existingUser = await this.usersRepository.findOne({
        where: {
          email: normalizedEmail,
          id: Not(id),
        },
      });

      if (existingUser) {
        throw new ConflictException('Email already registered');
      }

      user.email = normalizedEmail;
    }

    if (input.passwordHash !== undefined) {
      user.passwordHash = input.passwordHash;
    }

    if (input.displayName !== undefined) {
      user.displayName = input.displayName;
    }

    if (input.role !== undefined) {
      user.role = input.role;
    }

    if (input.isActive !== undefined) {
      user.isActive = input.isActive;
    }

    return this.usersRepository.save(user);
  }

  async deactivate(id: string): Promise<User> {
    return this.update(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findByIdOrFail(id);

    await this.usersRepository.remove(user);
  }

  private assertPersistableRole(role?: UserRole): void {
    if (role === UserRole.Guest) {
      throw new BadRequestException(
        'Guest users are temporary and cannot be persisted',
      );
    }
  }
}
