import { runDatabaseQueueTests } from '../src/test-utils'

import { MockDatabaseQueue } from './mocks/MockDatabaseQueue'
import { MockDatabaseWorker } from './mocks/MockDatabaseWorker'

const poolConfig = {}

runDatabaseQueueTests(poolConfig, MockDatabaseQueue, MockDatabaseWorker)
