export class WebhookDto {
  bookingCode!: string;
  transactionStatus!: 'SUCCESS' | 'FAILED';
}