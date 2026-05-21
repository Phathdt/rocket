import { Module } from '@nestjs/common';
import { RealtimeModule } from './modules/realtime';

@Module({
  imports: [RealtimeModule],
})
export class AppModule {}
