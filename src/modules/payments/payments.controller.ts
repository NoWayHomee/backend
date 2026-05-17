import { Controller, Post, Param, Req, UseGuards, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookDto } from './dto/webhook.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout/:bookingId')
  checkout(@Param('bookingId') bookingId: string, @Req() req: any) {
    return this.paymentsService.checkout(bookingId, req.user.id);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() dto: WebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }
}