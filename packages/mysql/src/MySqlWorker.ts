import type { DatabaseWorkerOptions, JobProcessor } from '@racunis/core'
import { AbstractDatabaseWorker } from '@racunis/core'
import type { Pool, PoolConnection, PoolOptions } from 'mysql2/promise'

import type { MySqlQueue } from './MySqlQueue'

/**
 * MySqlWorker class that extends AbstractDatabaseWorker for MySQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabaseWorker<PoolOptions, Pool, PoolConnection, TPayload>
 */
export class MySqlWorker<TPayload> extends AbstractDatabaseWorker<PoolOptions, Pool, PoolConnection, TPayload> {
  /**
   * Creates a new MySqlWorker instance.
   *
   * @param {MySqlQueue<TPayload>} queue - The queue instance to work on.
   * @param {JobProcessor<TPayload>} processor - The job processor function.
   * @param {Partial<DatabaseWorkerOptions>} [options] - Optional worker options.
   * @returns {MySqlWorker<TPayload>} - The created MySqlWorker instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const worker = MySqlWorker.create(queue, job => processJob(job), { autostart: true });
   */
  static create<TPayload>(
    queue: MySqlQueue<TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>,
  ): MySqlWorker<TPayload> {
    return new MySqlWorker(queue, processor, options)
  }
}
