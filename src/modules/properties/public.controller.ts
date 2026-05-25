import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { property_status_enum } from '@prisma/client';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  // GET /public/rooms - Alias cong khai cho /properties/search.
  // Frontend customer goi endpoint nay, map vao logic tim kiem property.
  @Get('rooms')
  @ApiOperation({
    summary: 'Public property/room search (alias for /properties/search)',
  })
  @ApiQuery({ name: 'city', required: false, description: 'Filter by city' })
  @ApiQuery({
    name: 'checkIn',
    required: false,
    description: 'Check-in date ISO string',
  })
  @ApiQuery({
    name: 'checkOut',
    required: false,
    description: 'Check-out date ISO string',
  })
  @ApiQuery({
    name: 'propertyType',
    required: false,
    description: 'Filter by property type enum',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum base price',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum base price',
  })
  @ApiQuery({ name: 'guests', required: false, description: 'Number of guests' })
  @ApiOkResponse({ description: 'List of available properties.' })
  async searchRooms(
    @Query('city') city?: string,
    @Query('propertyType') propertyType?: string,
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('guests') guests?: string,
  ) {
    const where: Record<string, unknown> = {
      status: property_status_enum.active,
      deletedAt: null,
    };

    if (city) {
      where['city'] = { contains: city, mode: 'insensitive' };
    }

    if (propertyType) {
      where['propertyType'] = propertyType;
    }

    if (minPrice || maxPrice) {
      where['roomTypes'] = {
        some: {
          isActive: true,
          basePrice: {
            ...(minPrice ? { gte: Number(minPrice) } : {}),
            ...(maxPrice ? { lte: Number(maxPrice) } : {}),
          },
        },
      };
    }

    if (guests) {
      where['roomTypes'] = {
        some: {
          isActive: true,
          maxOccupancy: { gte: Number(guests) },
        },
      };
    }

    const properties = await this.prisma.property.findMany({
      where: where as any,
      include: {
        media: {
          where: { isCover: true },
          take: 1,
        },
        roomTypes: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            basePrice: true,
            maxOccupancy: true,
          },
          orderBy: { basePrice: 'asc' },
          take: 1,
        },
        _count: { select: { reviews: true } },
      },
      orderBy: [{ avgRating: 'desc' }, { totalReviews: 'desc' }],
      take: 50,
    });

    return properties.map((p) => ({
      id: p.id.toString(),
      slug: p.slug,
      name: p.name,
      propertyType: p.propertyType,
      city: p.city,
      address: p.address,
      avgRating: p.avgRating,
      totalReviews: p.totalReviews,
      starRating: p.starRating,
      coverImage: p.media[0]?.url ?? null,
      lowestPrice: p.roomTypes[0]?.basePrice?.toString() ?? null,
    }));
  }
}