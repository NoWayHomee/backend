import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  BookingResponseDto,
  CancelBookingResponseDto,
  ReviewIdResponseDto,
} from '../../common/dto/response.dto';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingCreateReviewDto } from './dto/create-review.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // POST /bookings - Tao booking va khoa ton kho phong.
  @Post()
  @ApiOperation({ summary: 'Create a booking with locked room inventory' })
  @ApiCreatedResponse({
    description: 'Booking created.',
    type: BookingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid dates or no availability.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Customer role is required.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingsService.create(user, dto);

    return BookingResponseDto.from(booking);
  }

  // GET /bookings/me - Lay danh sach booking cua customer hien tai.
  @Get('me')
  @ApiOperation({ summary: 'List bookings for the current customer' })
  @ApiOkResponse({
    description: 'Returns bookings for the authenticated customer.',
    type: [BookingResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Customer role is required.' })
  async findMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingsService.findMine(user);

    return bookings.map(BookingResponseDto.from);
  }

  // POST /bookings/:id/cancel - Huy booking va hoan lai phong trong.
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking and restore availability' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiCreatedResponse({
    description: 'Booking cancelled and availability restored.',
    type: CancelBookingResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Booking cannot be cancelled.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Customer role is required.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CancelBookingResponseDto> {
    const response = await this.bookingsService.cancel(user, id);

    return CancelBookingResponseDto.from(response);
  }

  // POST /bookings/:id/reviews - Tao review cho booking da checkout.
  @Post(':id/reviews')
  @ApiOperation({ summary: 'Review a checked-out booking' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiCreatedResponse({
    description: 'Booking review created.',
    type: ReviewIdResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Booking is not eligible for a review.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Customer role is required.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: BookingCreateReviewDto,
  ): Promise<ReviewIdResponseDto> {
    const response = await this.bookingsService.createReview(user, id, dto);

    return ReviewIdResponseDto.from(response);
  }
}
