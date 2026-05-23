import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReviewResponseDto } from '../../common/dto/response.dto';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CustomerCreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Roles(Role.CUSTOMER)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':bookingId')
  @ApiOperation({
    summary: 'Submit a post-stay review for a completed booking',
  })
  @ApiCreatedResponse({
    description: 'Review submitted successfully.',
    type: ReviewResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Booking is not eligible for a review.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Booking does not belong to you.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  @ApiConflictResponse({
    description: 'A review for this booking already exists.',
  })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
    @Body() dto: CustomerCreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.createReview(user, bookingId, dto);

    return ReviewResponseDto.from(review);
  }
}
