import type { AbstractDatabaseQueue, DatabaseQueueOptions } from '../AbstractDatabaseQueue'
import type { AbstractDatabaseWorker, DatabaseWorkerOptions } from '../AbstractDatabaseWorker'
import type { JobProcessor } from '../types'

export interface DatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload> {
  new (
    name: string, poolConfig: TPoolConfig, options?: Partial<DatabaseQueueOptions>
  ): AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>
  create(
    name: string, poolConfig: TPoolConfig, options?: Partial<DatabaseQueueOptions>
  ): Promise<AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>>
  defaultOptions: DatabaseQueueOptions
}

export interface DatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload> {
  new (
    queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>
  ): AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>
  create(
    queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>
  ): AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>
  defaultOptions: DatabaseWorkerOptions
}
