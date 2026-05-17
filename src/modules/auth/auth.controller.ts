import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AuthService,
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
  SafeUser,
} from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() registerDto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful and access token returned.',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponse> {
    return this.authService.login(loginDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 201,
    description: 'Refresh token rotated successfully.',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponse> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout current device session' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
  })
  @ApiResponse({ status: 401, description: 'Invalid active session.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoutResponse> {
    return this.authService.logout(user.id);
  }
}
