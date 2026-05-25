import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  UserResponseDto,
} from '../../common/dto/response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/register - Dang ky tai khoan customer moi.
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a customer account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid registration payload.' })
  @ApiConflictResponse({ description: 'Email or phone already exists.' })
  async register(@Body() registerDto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.authService.register(registerDto);

    return UserResponseDto.from(user);
  }

  // POST /auth/login - Dang nhap bang email va mat khau.
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Login successful and access token returned.',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid login payload.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    const response = await this.authService.login(loginDto, {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });

    return LoginResponseDto.from(response);
  }

  // POST /auth/refresh - Doi refresh token va cap access token moi.
  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate refresh token and issue a new access token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiCreatedResponse({
    description: 'Refresh token rotated successfully.',
    type: RefreshResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid refresh payload.' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponseDto> {
    const response = await this.authService.refresh(refreshTokenDto);

    return RefreshResponseDto.from(response);
  }

  // GET /auth/me - Lay thong tin user hien tai tu JWT payload.
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiOkResponse({
    description: 'Returns current user from JWT.',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  async getMe(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const userEntity = await this.authService.getMe(user.id);

    return UserResponseDto.from(userEntity);
  }

  // POST /auth/logout - Dang xuat phien dang nhap hien tai.
  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout current device session' })
  @ApiOkResponse({
    description: 'Logged out successfully.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid active session.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(user.id);
  }
}
