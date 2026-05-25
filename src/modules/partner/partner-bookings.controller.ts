import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

export class BookingReportDto {
  totalBookings!: number;
  confirmedBookings!: number;
  cancelledBookings!: number;
  totalRevenue!: string;
  partnerPayoutTotal!: string;
  periodStart!: string;
  periodEnd!: string;
}

@ApiTags('Partner')
@ApiBearerAuth()
@Roles(Role.PARTNER)
@Controller('partner')
export class PartnerBookingsController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /partner/booking-report - Bao cao doanh thu dat phong cua partner.
  @Get('booking-report')
  @ApiOperation({ summary: 'Get booking revenue report for the partner' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date ISO string (default: 30 days ago)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date ISO string (default: today)',
  })
  @ApiOkResponse({ description: 'Booking revenue report.', type: BookingReportDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  async getBookingReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<BookingReportDto> {
    const periodEnd = to ? new Date(to) : new Date();
    const periodStart = from
      ? new Date(from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Lay partner profile de lay danh sach property IDs.
    const partnerProfile = await this.prisma.partnerProfile.findUnique({
      where: { userId: BigInt(user.id) },
      select: {
        id: true,
        properties: { select: { id: true } },
      },
    });

    if (!partnerProfile) {
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: '0',
        partnerPayoutTotal: '0',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    }

    const propertyIds = partnerProfile.properties.map((p) => p.id);

    if (propertyIds.length === 0) {
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: '0',
        partnerPayoutTotal: '0',
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    }

    // Aggregate tat ca bookings cua partner trong khoang thoi gian.
    const [aggregate, total, confirmed, cancelled] = await Promise.all([
      this.prisma.booking.aggregate({
        where: {
          propertyId: { in: propertyIds },
          createdAt: { gte: periodStart, lte: periodEnd },
          deletedAt: null,
        },
        _sum: {
          totalAmount: true,
          partnerPayoutAmount: true,
        },
      }),
      this.prisma.booking.count({
        where: {
          propertyId: { in: propertyIds },
          createdAt: { gte: periodStart, lte: periodEnd },
          deletedAt: null,
        },
      }),
      this.prisma.booking.count({
        where: {
          propertyId: { in: propertyIds },
          createdAt: { gte: periodStart, lte: periodEnd },
          status: { in: ['confirmed', 'checked_in', 'checked_out'] as any },
          deletedAt: null,
        },
      }),
      this.prisma.booking.count({
        where: {
          propertyId: { in: propertyIds },
          createdAt: { gte: periodStart, lte: periodEnd },
          status: 'cancelled' as any,
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalBookings: total,
      confirmedBookings: confirmed,
      cancelledBookings: cancelled,
      totalRevenue: aggregate._sum.totalAmount?.toString() ?? '0',
      partnerPayoutTotal: aggregate._sum.partnerPayoutAmount?.toString() ?? '0',
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }
}