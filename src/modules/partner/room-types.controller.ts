import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GenerateDailyRatesResponseDto } from '../../common/dto/response.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { GenerateDailyRatesDto } from './dto/generate-daily-rates.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/room-types')
export class PartnerRoomTypesController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post(':roomTypeId/daily-rates/generate')
  @ApiOperation({ summary: 'Generate daily inventory for a room type' })
  @ApiCreatedResponse({
    description: 'Daily inventory and rates generated for the room type.',
    type: GenerateDailyRatesResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or room type id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  @ApiNotFoundResponse({ description: 'Room type or rate plan not found.' })
  async generateDailyRates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roomTypeId') roomTypeId: string,
    @Body() dto: GenerateDailyRatesDto,
  ): Promise<GenerateDailyRatesResponseDto> {
    const parsedRoomTypeId = this.partnerService.parseBigIntParam(
      roomTypeId,
      'roomTypeId',
    );
    const response = await this.partnerService.generateDailyRates(
      user,
      parsedRoomTypeId,
      dto,
    );

    return GenerateDailyRatesResponseDto.from(response);
  }
}
