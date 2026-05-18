import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import {
  PaginatedPropertySearchResponseDto,
  PropertyDetailResponseDto,
} from '../../common/dto/response.dto';
import { PropertyDetailQueryDto } from './dto/property-detail-query.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { PropertiesService } from './properties.service';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15 * 60 * 1000)
  @ApiOperation({ summary: 'Search public properties' })
  @ApiOkResponse({
    description: 'Returns active properties matching search and availability.',
    type: PaginatedPropertySearchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid search filters.' })
  async search(
    @Query() query: SearchPropertiesDto,
  ): Promise<PaginatedPropertySearchResponseDto> {
    const response = await this.propertiesService.search(query);

    return PaginatedPropertySearchResponseDto.from(response);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get public property detail by slug' })
  @ApiOkResponse({
    description: 'Returns property details and room types.',
    type: PropertyDetailResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range.' })
  @ApiNotFoundResponse({ description: 'Property not found.' })
  async findBySlug(
    @Param('slug') slug: string,
    @Query() query: PropertyDetailQueryDto,
  ): Promise<PropertyDetailResponseDto> {
    const property = await this.propertiesService.findBySlug(slug, query);

    return PropertyDetailResponseDto.from(property);
  }
}
