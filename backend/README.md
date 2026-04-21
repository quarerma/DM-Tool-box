# Backend

NestJS API for DM-Toolbox. Uses Drizzle ORM against Postgres, with JWT + cookie auth.

## Setup

```bash
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, etc.
```

Start Postgres (from the repo root):

```bash
docker compose up -d
```

## Run

```bash
npm run start:dev      # watch mode
npm run start          # one-off
npm run start:prod     # runs dist/main (requires npm run build first)
```

## Database

Schema lives in `src/drizzle/schema.ts`. Drizzle reads it to diff against the migration history in `drizzle/migrations/` and generate SQL.

### Typical workflow

1. Edit `src/drizzle/schema.ts`.
2. Generate a migration:
   ```bash
   npm run db:generate -- --name=add_users_table
   ```
   This writes `drizzle/migrations/000X_add_users_table.sql` plus a snapshot under `drizzle/migrations/meta/`. Commit both.
3. Apply pending migrations to the database:
   ```bash
   npm run db:migrate
   ```

### Naming

- `--name=<snake_case>` is optional but recommended — without it, Drizzle picks a random name like `silly_hulk`.
- The numeric prefix (`0000_`, `0001_`, ...) is assigned automatically and determines apply order.

### Reviewing before applying

The generated `.sql` file is plain SQL — open it, read it, edit it if you need to add a data backfill, a `CHECK` constraint, or anything Drizzle can't infer from the schema. Then run `db:migrate`.

### Drizzle Studio

Drizzle's equivalent of Prisma Studio — a web UI for browsing and editing rows:

```bash
npm run db:studio
```

Opens at <https://local.drizzle.studio>. Reads `DATABASE_URL` from `.env`.

### Scripts reference

| Script | Command | Purpose |
| --- | --- | --- |
| `db:generate` | `drizzle-kit generate` | Diff schema → new SQL migration file |
| `db:migrate` | `drizzle-kit migrate` | Apply pending migrations |
| `db:studio` | `drizzle-kit studio` | Browse DB in the browser |

For prototyping only, `npx drizzle-kit push` skips the migration file and pushes schema changes directly. Don't use it against any DB with data you care about — there's no history.

## Tests

```bash
npm run test           # unit
npm run test:e2e       # e2e
npm run test:cov       # coverage
```
