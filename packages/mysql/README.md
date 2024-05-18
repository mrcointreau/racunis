<p align='center'>
  <img src='https://github.com/mrcointreau/racunis/raw/main/assets/logo.svg' alt='Racunis Logo' width='200' height='200'>
</p>

# @racunis/mysql

`@racunis/mysql` is a TypeScript-based, robust, and flexible job queueing system designed for MySQL databases. It facilitates easy management of background tasks in Node.js applications using MySQL. The system abstracts the complexities of database operations and job processing, offering a straightforward and powerful API for job queueing and processing.

## Features

- MySQL-specific implementations of core abstractions.
- Type definitions for jobs and events.
- Easy to extend and integrate into existing applications.
- Configurable options for queues and workers.
- Support for handling multiple job types within a worker.
- Event handling for job states and errors.

To install `@racunis/mysql`, use one of the following commands:

```bash
# npm
npm install @racunis/mysql

# yarn
yarn add @racunis/mysql

# pnpm
pnpm add @racunis/mysql

# bun
bun add @racunis/mysql
```

## Usage

### Example

Here is a complete example of how to use `@racunis/mysql` to manage a job queue and worker with MySQL.

```typescript
import { MySqlQueue, MySqlWorker } from '@racunis/mysql'

interface JobPayload {
  task: string
}

const main = async () => {
  // Create the queue
  const queue = await MySqlQueue.create<JobPayload>('Queue', {
    user: 'user',
    password: 'password',
    host: 'localhost',
    database: 'db',
    port: 'port',
  })

  // Add a job to the queue
  await queue.add({ task: 'processData' }, 10)

  // Create a worker to process jobs from the queue
  const worker = MySqlWorker.create(queue, (job) => {
    console.log('Processing job:', job.payload.task)
  })
}

try {
  await main()
}
catch (error) {
  console.error(error)
}
```

### Handling Multiple Job Types

To handle different job types within a worker, you can use a switch statement to process each job type accordingly.

```typescript
import { MySqlQueue, MySqlWorker } from '@racunis/mysql'
import type { Job } from '@racunis/core'

// Define job payload interfaces for different job types
export interface EmailProcessingJobPayload {
  type: 'EmailProcessing'
  details: {
    recipient: string
    content: string
  }
}

export interface DataMigrationJobPayload {
  type: 'DataMigration'
  details: {
    source: string
    destination: string
  }
}

export interface ReportGenerationJobPayload {
  type: 'ReportGeneration'
  details: {
    reportId: string
    requestedBy: string
  }
}

// Union type for job payloads
export type JobPayload = EmailProcessingJobPayload | DataMigrationJobPayload | ReportGenerationJobPayload

const main = async () => {
  // Create the queue
  const queue = await MySqlQueue.create<JobPayload>('Queue', {
    user: 'user',
    password: 'password',
    host: 'localhost',
    database: 'db',
    port: 'port',
  })

  // Add jobs to the queue
  await queue.add({ type: 'EmailProcessing', details: { recipient: 'user@example.com', content: 'Hello, World!' } }, 5)
  await queue.add({ type: 'DataMigration', details: { source: 'System A', destination: 'System B' } }, 3)
  await queue.add({ type: 'ReportGeneration', details: { reportId: 'R123', requestedBy: 'admin' } }, 4)

  // Create a worker to process jobs from the queue
  const worker = MySqlWorker.create(queue, (job) => {
    const { type, details } = job.payload
    switch (type) {
      case 'EmailProcessing':
        console.log(`Processing Email Job: Recipient - ${details.recipient}, Content - ${details.content}`)
        break
      case 'DataMigration':
        console.log(`Processing Data Migration Job: Source - ${details.source}, Destination - ${details.destination}`)
        break
      case 'ReportGeneration':
        console.log(`Processing Report Generation Job: Report ID - ${details.reportId}, Requested By - ${details.requestedBy}`)
        break
    }
  })
}

try {
  await main()
}
catch (error) {
  console.error(error)
}
```

## Queue and Worker Options

`@racunis/mysql` provides configurable options for queues and workers to customize their behavior.

### Queue Options

- **`autostart`**: Automatically start processing jobs when the queue is created. Default is `true`.

    ```typescript
    const queue = await MySqlQueue.create<JobPayload>('Queue', {
      user: 'user',
      password: 'password',
      host: 'localhost',
      database: 'db',
      port: 'port',
    }, {
      autostart: false, // Do not start automatically
    })
    ```

### Worker Options

- **`autostart`**: Automatically start the worker when it is created. Default is `true`.
- **`processingInterval`**: Interval in milliseconds between job processing attempts. Default is `0`.
- **`waitingInterval`**: Interval in milliseconds for checking new jobs when the worker is waiting. Default is `1000`.
- **`maxRetries`**: Maximum number of retries for processing a job. Default is `3`.
- **`retryInterval`**: Interval in milliseconds between retry attempts. Default is `500`.

    ```typescript
    const worker = MySqlWorker.create<JobPayload>(queue, (job) => {
      console.log('Processing job:', job.payload.task)
    }, {
      autostart: false, // Do not start automatically
      processingInterval: 1000, // Process jobs every 1 second
      waitingInterval: 2000, // Check for new jobs every 2 seconds
      maxRetries: 5, // Retry failed jobs up to 5 times
      retryInterval: 1000, // Wait 1 second between retries
    })
    ```

These options allow you to tailor the behavior of queues and workers to fit your specific requirements.

## Queue and Worker Events

`@racunis/mysql` supports various events for job queues and workers to handle job states and errors effectively. Below is an overview of the events and how you can use them.

### Queue Events

These events are triggered by the queue during different stages of job processing.

- **activated**: Emitted when a job is activated.
- **completed**: Emitted when a job is completed.
- **failed**: Emitted when a job fails.
- **error**: Emitted when an error occurs.

```typescript
import { MySqlQueue } from '@racunis/mysql'
import type { Job } from '@racunis/core'

interface JobPayload {
  type: string
  details: any
}

const main = async () => {
  // Create the queue
  const queue = await MySqlQueue.create<JobPayload>('Queue', {
    user: 'user',
    password: 'password',
    host: 'localhost',
    database: 'db',
    port: 'port',
  })

  // Event listener for when a job is activated
  queue.on('activated', ({ job }) => {
    console.log(`Job activated: ${job.id}`)
  })

  // Event listener for when a job is completed
  queue.on('completed', ({ job }) => {
    console.log(`Job completed: ${job.id}`)
  })

  // Event listener for when a job fails
  queue.on('failed', ({ job, error }) => {
    console.log(`Job failed: ${job.id}, Error: ${error.message}`)
  })

  // Event listener for queue errors
  queue.on('error', ({ error }) => {
    console.error(`Queue error: ${error.message}`)
  })

  // Add jobs to the queue
  await queue.add({ type: 'EmailProcessing', details: { recipient: 'user@example.com', content: 'Hello, World!' } }, 5)
}

try {
  await main()
}
catch (error) {
  console.error(error)
}
```

### Worker Events

These events are triggered by the worker while processing jobs.

- **waiting**: Emitted when the worker is waiting for a job.
- **activated**: Emitted when a job is activated.
- **completed**: Emitted when a job is completed.
- **failed**: Emitted when a job fails.

```typescript
import { MySqlQueue, MySqlWorker } from '@racunis/mysql'
import type { Job } from '@racunis/core'

interface JobPayload {
  type: string
  details: any
}

const main = async () => {
  // Create the queue
  const queue = await MySqlQueue.create<JobPayload>('Queue', {
    user: 'user',
    password: 'password',
    host: 'localhost',
    database: 'db',
    port: 'port',
  })

  // Create a worker to process jobs from the queue
  const worker = MySqlWorker.create(queue, (job) => {
    const { type, details } = job.payload
    switch (type) {
      case 'EmailProcessing':
        console.log(`Processing Email Job: Recipient - ${details.recipient}, Content - ${details.content}`)
        break
      case 'DataMigration':
        console.log(`Processing Data Migration Job: Source - ${details.source}, Destination - ${details.destination}`)
        break
      case 'ReportGeneration':
        console.log(`Processing Report Generation Job: Report ID - ${details.reportId}, Requested By - ${details.requestedBy}`)
        break
    }
  }, { autostart: false })

  // Event listener for when the worker is waiting for a job
  worker.on('waiting', () => {
    console.log('Worker is waiting for a job...')
  })

  // Event listener for when a job is activated
  worker.on('activated', ({ job }) => {
    console.log(`Job activated: ${job.id}`)
  })

  // Event listener for when a job is completed
  worker.on('completed', ({ job }) => {
    console.log(`Job completed: ${job.id}`)
  })

  // Event listener for when a job fails
  worker.on('failed', ({ job, error }) => {
    console.log(`Job failed: ${job.id}, Error: ${error.message}`)
  })

  // Start the worker
  worker.start()
}

try {
  await main()
}
catch (error) {
  console.error(error)
}
```

### Queue and Worker Control

`@racunis/mysql` provides mechanisms to control the execution of queues and workers, as well as methods to manage the state of jobs in the queue.

#### Getting Job Counts

You can get the count of jobs in various states using the `getJobCounts` method. This is useful for monitoring and managing the state of your job queue.

```typescript
const jobCounts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed')
console.log(`Waiting: ${jobCounts.waiting}`)
console.log(`Active: ${jobCounts.active}`)
console.log(`Completed: ${jobCounts.completed}`)
console.log(`Failed: ${jobCounts.failed}`)
```

This will give you an object with the counts of jobs in the specified states, helping you keep track of the queue's status.

#### Starting and Stopping Queues and Workers

You can start and stop job processing in queues and workers using the `start` and `stop` methods.

- **Queue Start/Stop**: Use `start()` to begin processing jobs in the queue and `stop()` to halt job processing.

    ```typescript
    await queue.start() // Start processing jobs
    await queue.stop()  // Stop processing jobs
    ```

- **Worker Start/Stop**: Use `start()` to begin job processing by the worker and `stop()` to halt job processing.

    ```typescript
    worker.start() // Start the worker
    await worker.stop() // Stop the worker
    ```

If you attempt to start a worker on a stopped queue, the worker will not start. Conversely, if you restart a queue that has a previously stopped worker, the worker will automatically start processing jobs again.

#### Draining and Emptying the Queue

`@racunis/mysql` provides methods to manage the jobs in the queue:

- **`drain()`**: Deletes all waiting jobs in the queue.

    ```typescript
    await queue.drain() // Clear all waiting jobs
    ```

- **`empty()`**: Deletes all jobs in all states (waiting, active, completed, and failed).

    ```typescript
    await queue.empty() // Clear all jobs in the queue
    ```

These methods allow you to maintain control over the job queue, ensuring you can clear jobs as needed.

#### Closing the Queue

The close method allows you to close the queue and release all associated resources. This is particularly useful for clean-up operations and ensuring that all connections are properly terminated.

```typescript
await queue.close() // Close the queue and release resources
```

This method stops the queue from processing jobs, closes all associated workers, and releases any resources used by the queue, such as database connections.

## Contributing

I appreciate your interest in contributing! Please see the [CONTRIBUTING.md](https://github.com/mrcointreau/racunis/blob/main/CONTRIBUTING.md) file for guidelines on how to contribute.

## License

`@racunis/core` is licensed under the MIT License. See the [LICENSE](https://github.com/mrcointreau/racunis/blob/main/LICENSE) file for more details.
