import { authEvents } from './tables/auth_events.table';
import { loginCodes, loginCodesRelations } from './tables/login_codes.table';
import { musicTrack } from './tables/music_track.table';
import { userDevices, userDevicesRelations } from './tables/user_devices.table';
import {
  userSessions,
  userSessionsRelations,
} from './tables/user_sessions.table';
import { users } from './tables/users.table';

export {
  users,
  userDevices,
  userDevicesRelations,
  userSessions,
  userSessionsRelations,
  loginCodes,
  loginCodesRelations,
  authEvents,
  musicTrack,
};

export const schema = {
  users,
  userDevices,
  userDevicesRelations,
  userSessions,
  userSessionsRelations,
  loginCodes,
  loginCodesRelations,
  authEvents,
  musicTrack,
};
