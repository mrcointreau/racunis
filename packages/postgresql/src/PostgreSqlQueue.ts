import type { DatabaseQueueOptions } from '@racunis/core'
import { AbstractDatabaseQueue } from '@racunis/core'
import pg from 'pg'

import { PostgreSqlPool } from './PostgreSqlPool'

/**
 * PostgreSqlQueue class that extends AbstractDatabaseQueue for PostgreSQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabaseQueue<pg.PoolConfig, pg.Pool, pg.PoolClient, TPayload>
 */
export class PostgreSqlQueue<TPayload> extends AbstractDatabaseQueue<pg.PoolConfig, pg.Pool, pg.PoolClient, TPayload> {
  /**
   * Creates a new PostgreSqlQueue instance and initializes it.
   *
   * @param {string} name - The name of the queue.
   * @param {pg.PoolConfig} poolConfig - The configuration for the PostgreSQL pool.
   * @param {Partial<DatabaseQueueOptions>} [options] - Optional queue options.
   * @returns {Promise<PostgreSqlQueue<TPayload>>} - A promise that resolves to the created PostgreSqlQueue instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const queue = await PostgreSqlQueue.create('Queue', { connectionString: 'postgresql://user:password@localhost:port/db' });
   */
  static async create<TPayload>(
    name: string, poolConfig: pg.PoolConfig, options?: Partial<DatabaseQueueOptions>,
  ): Promise<PostgreSqlQueue<TPayload>> {
    const queue = new PostgreSqlQueue<TPayload>(name, poolConfig, options)
    await queue.initialize()

    return queue
  }

  /**
   * Creates a PostgreSqlPool instance with the given pool configuration.
   *
   * @param {pg.PoolConfig} poolConfig - The configuration for the PostgreSQL pool.
   * @returns {PostgreSqlPool<TPayload>} - The created PostgreSqlPool instance.
   * @template TPayload - The type of the job payload.
   */
  createPool(poolConfig: pg.PoolConfig): PostgreSqlPool<TPayload> {
    return new PostgreSqlPool(new pg.Pool(poolConfig))
  }
}
