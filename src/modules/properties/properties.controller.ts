import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/public.decorator';
import { PropertiesService } from './properties.service';
import type { MockProperty } from './properties.service';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get mock properties list' })
  @ApiResponse({
    status: 200,
    description: 'Returns mock property data for frontend development.',
  })
  findAll(): MockProperty[] {
    return this.propertiesService.findAll();
  }
}
