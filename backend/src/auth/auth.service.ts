import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
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
    const user = await this.usersService.create({
      email: `guest+${guestId}@weblive.local`,
      passwordHash: await hash(randomUUID(), 12),
      displayName: guestLoginDto.displayName,
      role: UserRole.Guest,
    });

    return this.createAuthResponse(toUserResponse(user));
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    return toUserResponse(user);
  }

  private createAuthResponse(user: UserResponse): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
