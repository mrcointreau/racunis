import { AbstractDatabasePool } from '../../src/AbstractDatabasePool'

import { MockDatabasePoolClient } from './MockDatabasePoolClient'

export class MockDatabasePool<TPayload> extends AbstractDatabasePool<unknown, unknown, TPayload> {
  getClient(queueName: string): Promise<MockDatabasePoolClient<TPayload>> {
    return Promise.resolve(new MockDatabasePoolClient({}, queueName))
  }

  close(): Promise<void> {
    MockDatabasePoolClient.id = 1
    MockDatabasePoolClient.jobs = []

    return Promise.resolve()
  }
}
