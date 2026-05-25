import {
  Controller,
  Post,
  Param,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
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
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookDto } from './dto/webhook.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  CheckoutResponseDto,
  WebhookResponseDto,
} from 'src/common/dto/response.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // POST /payments/checkout/:bookingId - Tao phien thanh toan cho booking.
  @UseGuards(JwtAuthGuard)
  @Post('checkout/:bookingId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a payment checkout session for a booking' })
  @ApiCreatedResponse({
    description: 'Checkout session created for the authenticated customer.',
    type: CheckoutResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Booking is not in pending status.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Booking does not belong to you.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  checkout(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutResponseDto> {
    return this.paymentsService.checkout(bookingId, user.id);
  }

  // POST /payments/webhook - Nhan thong bao webhook tu nha cung cap thanh toan.
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment provider webhook notification' })
  @ApiOkResponse({
    description: 'Webhook processed successfully.',
    type: WebhookResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid webhook payload.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  handleWebhook(@Body() dto: WebhookDto): Promise<WebhookResponseDto> {
    return this.paymentsService.handleWebhook(dto);
  }
}
