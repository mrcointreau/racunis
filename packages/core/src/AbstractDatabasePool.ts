import type { AbstractDatabasePoolClient } from './AbstractDatabasePoolClient'

/**
 * Abstract class representing a database pool.
 * @template TPool - The type of the pool.
 * @template TPoolClient - The type of the pool client.
 * @template TPayload - The type of the job payload.
 */
export abstract class AbstractDatabasePool<TPool, TPoolClient, TPayload> {
  /**
   * The underlying pool instance.
   * @protected
   * @type {TPool}
   */
  protected pool: TPool

  /**
   * Creates an instance of AbstractDatabasePool.
   * @param {TPool} pool - The underlying pool instance.
   */
  constructor(pool: TPool) {
    this.pool = pool
  }

  /**
   * Gets a client from the pool for the specified queue.
   * @abstract
   * @param {string} queueName - The name of the queue.
   * @returns {Promise<AbstractDatabasePoolClient<TPoolClient, TPayload>>} - The pool client.
   * @example
   * const client = await pool.getClient('Queue');
   */
  abstract getClient(queueName: string): Promise<AbstractDatabasePoolClient<TPoolClient, TPayload>>

  /**
   * Closes the pool and releases all resources.
   * @abstract
   * @returns {Promise<void>}
   * @example
   * await pool.close();
   */
  abstract close(): Promise<void>
}
