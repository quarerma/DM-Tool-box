import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.table';
import { relations } from 'drizzle-orm/relations';

export const musicTrack = pgTable('music_track', {
  id: serial('id').primaryKey(),
  alt_name: varchar('alt_name', { length: 255 }).notNull(),
  loop_start: integer('loop_start').default(0),
  loop_end: integer('loop_end').default(0),
  replay: boolean('replay').notNull().default(true),
  url: varchar('url', { length: 255 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  updated_at: timestamp('update_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const musicTrackRelations = relations(musicTrack, ({ one }) => ({
  user: one(users, {
    fields: [musicTrack.user_id],
    references: [users.id],
  }),
}));
