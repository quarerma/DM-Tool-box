import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { users } from './users.table';

export const userDevices = pgTable(
  'user_devices',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fingerprintHash: text('fingerprint_hash').notNull(),
    fingerprintData: jsonb('fingerprint_data').notNull(),
    deviceId: text('device_id').notNull(),
    userAgent: text('user_agent').notNull(),
    deviceSecretHash: text('device_secret_hash').notNull(),
    lastLogin: timestamp('last_login'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    authenticated: boolean('authenticated').default(false),
  },
  (table) => ({
    uniqueUserDevice: unique('user_devices_user_id_device_id_unique').on(
      table.userId,
      table.deviceId,
    ),
  }),
);

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id],
  }),
}));
