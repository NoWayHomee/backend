import { Body, Controller, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  PartnerKycResponseDto,
  PropertyResponseDto,
} from '../../common/dto/response.dto';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AdminService } from './admin.service';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { UpdatePropertyStatusDto } from './dto/update-property-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // PATCH /admin/partners/:partnerProfileId/kyc - Duyet hoac tu choi ho so KYC cua partner.
  @Patch('partners/:partnerProfileId/kyc')
  @ApiOperation({ summary: 'Approve or reject a partner KYC application' })
  @ApiOkResponse({
    description: 'Partner KYC status updated successfully.',
    type: PartnerKycResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid KYC status payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin role is required.' })
  @ApiNotFoundResponse({ description: 'Partner profile not found.' })
  async updateKycStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('partnerProfileId') partnerProfileId: string,
    @Body() dto: UpdateKycStatusDto,
  ): Promise<PartnerKycResponseDto> {
    const partner = await this.adminService.updateKycStatus(
      user,
      partnerProfileId,
      dto,
    );

    return PartnerKycResponseDto.from(partner);
  }

  // PATCH /admin/properties/:propertyId/status - Cap nhat trang thai kiem duyet property.
  @Patch('properties/:propertyId/status')
  @ApiOperation({ summary: 'Approve, reject, or suspend a property listing' })
  @ApiOkResponse({
    description: 'Property moderation status updated successfully.',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid property status payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Admin role is required.' })
  @ApiNotFoundResponse({ description: 'Property not found.' })
  async updatePropertyStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdatePropertyStatusDto,
  ): Promise<PropertyResponseDto> {
    const property = await this.adminService.updatePropertyStatus(
      user,
      propertyId,
      dto,
    );

    return PropertyResponseDto.from(property);
  }
}
