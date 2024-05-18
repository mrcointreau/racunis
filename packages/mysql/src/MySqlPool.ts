import { AbstractDatabasePool } from '@racunis/core'
import type { Pool, PoolConnection } from 'mysql2/promise'

import { MySqlPoolClient } from './MySqlPoolClient'

/**
 * MySqlPool class that extends AbstractDatabasePool for MySQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabasePool<Pool, PoolConnection, TPayload>
 */
export class MySqlPool<TPayload> extends AbstractDatabasePool<Pool, PoolConnection, TPayload> {
  /**
   * Gets a MySqlPoolClient instance for the specified queue.
   *
   * @param {string} queueName - The name of the queue.
   * @returns {Promise<MySqlPoolClient<TPayload>>} - A promise that resolves to the MySqlPoolClient instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const client = await pool.getClient('Queue');
   */
  async getClient(queueName: string): Promise<MySqlPoolClient<TPayload>> {
    return new MySqlPoolClient(await this.pool.getConnection(), queueName)
  }

  /**
   * Closes the MySQL pool and releases all resources.
   *
   * @returns {Promise<void>}
   * @example
   * await pool.close();
   */
  async close(): Promise<void> {
    await this.pool.end()
  }
}
