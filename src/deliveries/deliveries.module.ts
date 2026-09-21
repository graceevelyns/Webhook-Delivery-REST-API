import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Delivery])],
})
export class DeliveriesModule {}
