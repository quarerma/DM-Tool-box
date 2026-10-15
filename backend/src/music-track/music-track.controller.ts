import { Controller } from '@nestjs/common';
import { MusicTrackService } from './music-track.service';

@Controller('music-track')
export class MusicTrackController {
  constructor(private readonly musicTrackService: MusicTrackService) {}
}
