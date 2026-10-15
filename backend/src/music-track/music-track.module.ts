import { Module } from '@nestjs/common';
import { MusicTrackService } from './music-track.service';
import { MusicTrackController } from './music-track.controller';

@Module({
  controllers: [MusicTrackController],
  providers: [MusicTrackService],
})
export class MusicTrackModule {}
