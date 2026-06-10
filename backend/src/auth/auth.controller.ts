import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import { AuthenticatedRequest } from '../shared/types/authenticated-request.type';
import { UserResponse } from '../users/user-response.type';
import { AuthResponse } from './auth-response.type';
import { AuthService } from './auth.service';
import { GuestLoginDto } from './dto/guest-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('guest')
  guestLogin(@Body() guestLoginDto: GuestLoginDto): Promise<AuthResponse> {
    return this.authService.guestLogin(guestLoginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest): Promise<UserResponse> {
    return this.authService.getProfile(request.user);
  }
}
