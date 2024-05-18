import type { DatabaseWorkerOptions, JobProcessor } from '@racunis/core'
import { AbstractDatabaseWorker } from '@racunis/core'
import type pg from 'pg'

import type { PostgreSqlQueue } from './PostgreSqlQueue'

/**
 * PostgreSqlWorker class that extends AbstractDatabaseWorker for PostgreSQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabaseWorker<pg.PoolConfig, pg.Pool, pg.PoolClient, TPayload>
 */
export class PostgreSqlWorker<TPayload> extends AbstractDatabaseWorker<pg.PoolConfig, pg.Pool, pg.PoolClient, TPayload> {
  /**
   * Creates a new PostgreSqlWorker instance.
   *
   * @param {PostgreSqlQueue<TPayload>} queue - The queue instance to work on.
   * @param {JobProcessor<TPayload>} processor - The job processor function.
   * @param {Partial<DatabaseWorkerOptions>} [options] - Optional worker options.
   * @returns {PostgreSqlWorker<TPayload>} - The created PostgreSqlWorker instance.
   * @template TPayload - The type of the job payload.
   * @example
   * const worker = PostgreSqlWorker.create(queue, job => processJob(job), { autostart: true });
   */
  static create<TPayload>(
    queue: PostgreSqlQueue<TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>,
  ): PostgreSqlWorker<TPayload> {
    return new PostgreSqlWorker(queue, processor, options)
  }
}
