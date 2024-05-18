import { runDatabaseWorkerTests } from '../src/test-utils'

import { MockDatabaseQueue } from './mocks/MockDatabaseQueue'
import { MockDatabaseWorker } from './mocks/MockDatabaseWorker'

const poolConfig = {}

runDatabaseWorkerTests(poolConfig, MockDatabaseQueue, MockDatabaseWorker)
