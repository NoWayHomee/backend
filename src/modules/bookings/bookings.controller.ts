import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Booking } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  BookingsService,
  type CancellationResult,
  type ReviewResult,
} from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking with locked room inventory' })
  @ApiResponse({ status: 201, description: 'Booking created.' })
  @ApiResponse({ status: 400, description: 'Invalid dates or no availability.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.create(user, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'List bookings for the current customer' })
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<Booking[]> {
    return this.bookingsService.findMine(user);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking and restore availability' })
  @ApiParam({ name: 'id', example: 1 })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CancellationResult> {
    return this.bookingsService.cancel(user, id);
  }

  @Post(':id/reviews')
  @ApiOperation({ summary: 'Review a checked-out booking' })
  @ApiParam({ name: 'id', example: 1 })
  createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResult> {
    return this.bookingsService.createReview(user, id, dto);
  }
}
