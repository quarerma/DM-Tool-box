import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { users } from './users.table';

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
