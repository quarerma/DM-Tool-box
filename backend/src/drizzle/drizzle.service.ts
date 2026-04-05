import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { schema } from './schema';

@Injectable()
export class DrizzleService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30_000,
      allowExitOnIdle: true,
    });

    this.db = drizzle(this.pool, { schema });
  }

  getSession() {
    return this.db;
  }

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
