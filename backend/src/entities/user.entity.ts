import { users } from '../drizzle/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type SanitizedUser = Omit<User, 'password'>;
