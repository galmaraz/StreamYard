import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';

import { AuthenticatedRequest } from '../shared/types/authenticated-request.type';
import { UserRole } from '../users/user-role.enum';
import { toUserResponse, UserResponse } from '../users/user-response.type';
import { UsersService } from '../users/users.service';
import { AuthResponse } from './auth-response.type';
import { GuestLoginDto } from './dto/guest-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type JwtPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await hash(registerDto.password, 12);
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      displayName: registerDto.displayName,
      role: UserRole.Host,
    });

    return this.createAuthResponse(toUserResponse(user));
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthResponse(toUserResponse(user));
  }

  async guestLogin(guestLoginDto: GuestLoginDto): Promise<AuthResponse> {
    const guestId = randomUUID();
    const now = new Date();
    const user: UserResponse = {
      id: guestId,
      email: '',
      displayName: guestLoginDto.displayName.trim(),
      role: UserRole.Guest,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return this.createAuthResponse(user);
  }

  async getProfile(
    authenticatedUser: AuthenticatedRequest['user'],
  ): Promise<UserResponse> {
    if (authenticatedUser.role === UserRole.Guest) {
      const now = new Date();

      return {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        displayName: authenticatedUser.displayName || 'Invitado',
        role: UserRole.Guest,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    const user = await this.usersService.findById(authenticatedUser.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return toUserResponse(user);
  }

  private createAuthResponse(user: UserResponse): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
