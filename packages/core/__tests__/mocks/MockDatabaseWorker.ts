import type { DatabaseWorkerOptions } from '../../src/AbstractDatabaseWorker'
import { AbstractDatabaseWorker } from '../../src/AbstractDatabaseWorker'
import type { JobProcessor } from '../../src/types'

import type { MockDatabaseQueue } from './MockDatabaseQueue'

export class MockDatabaseWorker<TPayload> extends AbstractDatabaseWorker<unknown, unknown, unknown, TPayload> {
  static create<TPayload>(
    queue: MockDatabaseQueue<TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>,
  ): AbstractDatabaseWorker<unknown, unknown, unknown, TPayload> {
    return new MockDatabaseWorker(queue, processor, options)
  }
}
