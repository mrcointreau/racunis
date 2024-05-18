import { runDatabaseWorkerTests } from '@racunis/core/test-utils'

import { PostgreSqlQueue } from '../src/PostgreSqlQueue'
import { PostgreSqlWorker } from '../src/PostgreSqlWorker'

const poolConfig = {
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.POSTGRESQL_PORT),
}

runDatabaseWorkerTests(poolConfig, PostgreSqlQueue, PostgreSqlWorker)
