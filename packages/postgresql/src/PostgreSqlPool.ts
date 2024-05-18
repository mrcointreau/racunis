import { AbstractDatabasePool } from '@racunis/core'
import type pg from 'pg'

import { PostgreSqlPoolClient } from './PostgreSqlPoolClient'

/**
 * PostgreSqlPool class that extends AbstractDatabasePool for PostgreSQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabasePool<pg.Pool, pg.PoolClient, TPayload>
 */
export class PostgreSqlPool<TPayload> extends AbstractDatabasePool<pg.Pool, pg.PoolClient, TPayload> {
  /**
   * Gets a PostgreSqlPoolClient instance for the specified queue.
   *
   * @param {string} queueName - The name of the queue.
   * @returns {Promise<PostgreSqlPoolClient<TPayload>>} - A promise that resolves to the PostgreSqlPoolClient instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const client = await pool.getClient('Queue');
   */
  async getClient(queueName: string): Promise<PostgreSqlPoolClient<TPayload>> {
    return new PostgreSqlPoolClient(await this.pool.connect(), queueName)
  }

  /**
   * Closes the PostgreSQL pool and releases all resources.
   *
   * @returns {Promise<void>}
   * @example
   * await pool.close();
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}
