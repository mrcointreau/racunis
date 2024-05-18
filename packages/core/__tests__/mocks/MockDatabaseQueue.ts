import type { DatabaseQueueOptions } from '../../src/AbstractDatabaseQueue'
import { AbstractDatabaseQueue } from '../../src/AbstractDatabaseQueue'

import { MockDatabasePool } from './MockDatabasePool'

export class MockDatabaseQueue<TPayload> extends AbstractDatabaseQueue<unknown, unknown, unknown, TPayload> {
  static async create<TPayload>(
    name: string, poolConfig: unknown, options?: Partial<DatabaseQueueOptions>,
  ): Promise<MockDatabaseQueue<TPayload>> {
    const queue = new MockDatabaseQueue<TPayload>(name, poolConfig, options)
    await queue.initialize()

    return queue
  }

  createPool(poolConfig: unknown): MockDatabasePool<TPayload> {
    return new MockDatabasePool(poolConfig)
  }
}
