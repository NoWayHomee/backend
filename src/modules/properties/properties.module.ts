import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PublicController } from './public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PropertiesController, PublicController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}