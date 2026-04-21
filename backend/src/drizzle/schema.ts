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
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  twofa_enabled: boolean('twofa_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

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

export const userSessions = pgTable(
  'user_sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(),
    currentJti: text('current_jti').notNull(),
    previousJti: text('previous_jti'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastRefreshedAt: timestamp('last_refreshed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => ({
    uniqueUserSessionDevice: unique(
      'user_sessions_user_id_device_id_unique',
    ).on(table.userId, table.deviceId),
  }),
);

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const loginCodes = pgTable('login_codes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const loginCodesRelations = relations(loginCodes, ({ one }) => ({
  user: one(users, {
    fields: [loginCodes.userId],
    references: [users.id],
  }),
}));

export const schema = {
  users,
  userDevices,
  userDevicesRelations,
  userSessions,
  userSessionsRelations,
  loginCodes,
  loginCodesRelations,
};
