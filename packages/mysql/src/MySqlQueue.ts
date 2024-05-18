import type { DatabaseQueueOptions } from '@racunis/core'
import { AbstractDatabaseQueue } from '@racunis/core'
import type { Pool, PoolConnection, PoolOptions } from 'mysql2/promise'
import { createPool } from 'mysql2/promise'

import { MySqlPool } from './MySqlPool'

/**
 * MySqlQueue class that extends AbstractDatabaseQueue for MySQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabaseQueue<PoolOptions, Pool, PoolConnection, TPayload>
 */
export class MySqlQueue<TPayload> extends AbstractDatabaseQueue<PoolOptions, Pool, PoolConnection, TPayload> {
  /**
   * Creates a new MySqlQueue instance and initializes it.
   *
   * @param {string} name - The name of the queue.
   * @param {PoolOptions} poolConfig - The configuration for the MySQL pool.
   * @param {Partial<DatabaseQueueOptions>} [options] - Optional queue options.
   * @returns {Promise<MySqlQueue<TPayload>>} - A promise that resolves to the created MySqlQueue instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const queue = await MySqlQueue.create('Queue', { host: 'localhost', user: 'root', database: 'test' });
   */
  static async create<TPayload>(
    name: string, poolConfig: PoolOptions, options?: Partial<DatabaseQueueOptions>,
  ): Promise<MySqlQueue<TPayload>> {
    const queue = new MySqlQueue<TPayload>(name, poolConfig, options)
    await queue.initialize()

    return queue
  }

  /**
   * Creates a MySqlPool instance with the given pool configuration.
   *
   * @param {PoolOptions} poolConfig - The configuration for the MySQL pool.
   * @returns {MySqlPool<TPayload>} - The created MySqlPool instance.
   * @template TPayload - The type of the job payload.
   */
  createPool(poolConfig: PoolOptions): MySqlPool<TPayload> {
    return new MySqlPool(createPool(poolConfig))
  }
}
