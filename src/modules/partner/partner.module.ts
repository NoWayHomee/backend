import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PartnerBookingsController } from './partner-bookings.controller';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { PartnerPropertiesController } from './properties.controller';
import { PartnerRoomTypesController } from './room-types.controller';
import { PartnerService } from './partner.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PartnerPropertiesController,
    PartnerRoomTypesController,
    MediaController,
    PartnerBookingsController,
  ],
  providers: [PartnerService, MediaService],
})
export class PartnerModule {}