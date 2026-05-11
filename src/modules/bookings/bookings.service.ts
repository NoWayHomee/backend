import { Injectable } from '@nestjs/common';

export interface MockBookingResponse {
  success: boolean;
  bookingCode: string;
  message: string;
}

@Injectable()
export class BookingsService {
  createMockBooking(): MockBookingResponse {
    return {
      success: true,
      bookingCode: 'NWH-MOCK-0001',
      message: 'Mock booking created successfully.',
    };
  }
}
