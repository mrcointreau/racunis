import { runDatabaseQueueTests } from '@racunis/core/test-utils'

import { MySqlQueue } from '../src/MySqlQueue'
import { MySqlWorker } from '../src/MySqlWorker'

const poolConfig = {
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.MYSQL_PORT),
}

runDatabaseQueueTests(poolConfig, MySqlQueue, MySqlWorker)
