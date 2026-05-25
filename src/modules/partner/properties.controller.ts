import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
  PropertyAmenityResponseDto,
  PropertyPolicyResponseDto,
  PropertyResponseDto,
  RoomTypeResponseDto,
} from '../../common/dto/response.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdatePropertyAmenitiesDto } from './dto/update-property-amenities.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpsertPropertyPoliciesDto } from './dto/upsert-property-policies.dto';
import { PartnerService } from './partner.service';

@ApiTags('Partner Properties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/properties')
export class PartnerPropertiesController {
  constructor(private readonly partnerService: PartnerService) {}

  // POST /partner/properties - Tao property dang draft cho partner hien tai.
  @Post()
  @ApiOperation({ summary: 'Create a draft property for the current partner' })
  @ApiCreatedResponse({
    description: 'Draft property created.',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid property payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  async createProperty(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const property = await this.partnerService.createProperty(user, dto);

    return PropertyResponseDto.from(property);
  }

  // PATCH /partner/properties/:id - Cap nhat thong tin property thuoc partner.
  @Patch(':id')
  @ApiOperation({ summary: 'Update owned property details' })
  @ApiOkResponse({
    description: 'Owned property updated.',
    type: PropertyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid property update payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  @ApiNotFoundResponse({ description: 'Property not found or not owned.' })
  async updateProperty(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');
    const property = await this.partnerService.updateProperty(
      user,
      propertyId,
      dto,
    );

    return PropertyResponseDto.from(property);
  }

  // POST /partner/properties/:id/policies - Tao hoac cap nhat chinh sach cua property.
  @Post(':id/policies')
  @ApiOperation({ summary: 'Create or update owned property policies' })
  @ApiCreatedResponse({
    description: 'Property policies saved.',
    type: PropertyPolicyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid property policy payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  @ApiNotFoundResponse({ description: 'Property not found or not owned.' })
  async upsertPolicies(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpsertPropertyPoliciesDto,
  ): Promise<PropertyPolicyResponseDto> {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');
    const policy = await this.partnerService.upsertPropertyPolicies(
      user,
      propertyId,
      dto,
    );

    return PropertyPolicyResponseDto.from(policy);
  }

  // POST /partner/properties/:id/amenities - Thay the danh sach tien ich cua property.
  @Post(':id/amenities')
  @ApiOperation({ summary: 'Replace amenities for an owned property' })
  @ApiCreatedResponse({
    description: 'Property amenities replaced.',
    type: [PropertyAmenityResponseDto],
  })
  @ApiBadRequestResponse({ description: 'One or more amenities are invalid.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  @ApiNotFoundResponse({ description: 'Property not found or not owned.' })
  async updateAmenities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyAmenitiesDto,
  ): Promise<PropertyAmenityResponseDto[]> {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');
    const amenities = await this.partnerService.updatePropertyAmenities(
      user,
      propertyId,
      dto,
    );

    return amenities.map(PropertyAmenityResponseDto.from);
  }

  // POST /partner/properties/:id/room-types - Tao loai phong cho property.
  @Post(':id/room-types')
  @ApiOperation({ summary: 'Create a room type for an owned property' })
  @ApiCreatedResponse({
    description: 'Room type created.',
    type: RoomTypeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid room type payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  @ApiNotFoundResponse({ description: 'Property not found or not owned.' })
  async createRoomType(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateRoomTypeDto,
  ): Promise<RoomTypeResponseDto> {
    const propertyId = this.partnerService.parseBigIntParam(id, 'id');
    const roomType = await this.partnerService.createRoomType(
      user,
      propertyId,
      dto,
    );

    return RoomTypeResponseDto.from(roomType);
  }
}
