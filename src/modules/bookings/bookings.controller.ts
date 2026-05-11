import { Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { BookingsService } from './bookings.service';
import type { MockBookingResponse } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a mock booking' })
  @ApiResponse({
    status: 201,
    description: 'Returns a mock booking success response.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  create(): MockBookingResponse {
    return this.bookingsService.createMockBooking();
  }
}
