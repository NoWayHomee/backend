import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PresignedMediaUrlResponseDto } from 'src/common/dto/response.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PresignedMediaUrlQueryDto } from './dto/presigned-media-url.dto';
import { MediaService } from './media.service';

@ApiTags('Partner Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTNER)
@Controller('partner/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('presigned-url')
  @ApiOperation({ summary: 'Get Cloudinary presigned upload URL' })
  @ApiOkResponse({
    description: 'Presigned upload URL returned for the requested folder.',
    type: PresignedMediaUrlResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid media folder query.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Partner role is required.' })
  getPresignedUrl(
    @Query() query: PresignedMediaUrlQueryDto,
  ): PresignedMediaUrlResponseDto {
    const folder = query.folder ?? 'nowayhome/properties';

    return this.mediaService.getPresignedUrl(folder);
  }
}
