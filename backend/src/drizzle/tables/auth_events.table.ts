import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const authEvents = pgTable(
  'auth_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: integer('user_id'),
    deviceId: text('device_id'),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userCreatedAtIdx: index('auth_events_user_id_created_at_idx').on(
      table.userId,
      table.createdAt,
    ),
    eventCreatedAtIdx: index('auth_events_event_type_created_at_idx').on(
      table.eventType,
      table.createdAt,
    ),
  }),
);
