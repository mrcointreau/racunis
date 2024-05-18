<p align='center'>
  <img src='https://github.com/mrcointreau/racunis/raw/main/assets/logo.svg' alt='Racunis Logo' width='200' height='200'>
</p>

# @racunis/core

`@racunis/core` is a TypeScript-based, robust, and flexible framework for queue management, providing a foundation for implementing database-based job queues. This package includes abstract classes and error handling for creating and managing job queues, workers, and database pools.

## Features

- Abstract classes for database pools, clients, queues, and workers.
- Type definitions for jobs and events.
- Easy to extend and integrate into existing applications.
- Configurable options for queues and workers.
- Event handling for job states and errors.

To install `@racunis/core`, use one of the following commands:

```bash
# npm
npm install @racunis/core

# yarn
yarn add @racunis/core

# pnpm
pnpm add @racunis/core

# bun
bun add @racunis/core
```

## Usage

### Example

To use the `@racunis/core` package, you need to create concrete implementations of the abstract classes provided. Below is a basic example of how to extend and use these classes:

```typescript
import { AbstractDatabasePool, AbstractDatabasePoolClient, AbstractDatabaseQueue, AbstractDatabaseWorker, Job, JobState } from '@racunis/core';

// Example implementations
class MyDatabasePool extends AbstractDatabasePool<MyPool, MyPoolClient, MyPayload> {
  async getClient(queueName: string): Promise<AbstractDatabasePoolClient<MyPoolClient, MyPayload>> {
    // Implement getClient logic
  }

  async close(): Promise<void> {
    // Implement close logic
  }
}

class MyDatabasePoolClient extends AbstractDatabasePoolClient<MyPoolClient, MyPayload> {
  release(): void {
    // Implement release logic
  }

  async initQueueData(): Promise<void> {
    // Implement initQueueData logic
  }

  async insertJob(payload: MyPayload, state: JobState, priority: number): Promise<Job<MyPayload>> {
    // Implement insertJob logic
  }

  async acquireJob(): Promise<Job<MyPayload>> {
    // Implement acquireJob logic
  }

  async updateJobStateById(id: number, state: JobState, errorMessage?: string): Promise<Job<MyPayload>> {
    // Implement updateJobStateById logic
  }

  async countJobsByState(...states: JobState[]): Promise<{ [key in JobState]: number }> {
    // Implement countJobsByState logic
  }

  async deleteJobsByState(...states: JobState[]): Promise<void> {
    // Implement deleteJobsByState logic
  }

  async beginTransaction(): Promise<void> {
    // Implement beginTransaction logic
  }

  async commitTransaction(): Promise<void> {
    // Implement commitTransaction logic
  }

  async rollbackTransaction(): Promise<void> {
    // Implement rollbackTransaction logic
  }
}

class MyDatabaseQueue extends AbstractDatabaseQueue<MyPoolConfig, MyPool, MyPoolClient, MyPayload> {
  createPool(poolConfig: MyPoolConfig): AbstractDatabasePool<MyPool, MyPoolClient, MyPayload> {
    // Implement createPool logic
  }
}

class MyDatabaseWorker extends AbstractDatabaseWorker<MyPoolConfig, MyPool, MyPoolClient, MyPayload> {
  // Implement worker logic
}
```

## Queue and Worker Options

`@racunis/core` provides configurable options for queues and workers to customize their behavior.

### Queue Options

- **`autostart`**: Automatically start processing jobs when the queue is created. Default is `true`.

    ```typescript
    const queue = new MyDatabaseQueue('Queue', poolConfig, {
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
    const worker = new MyDatabaseWorker(queue, (job) => {
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

`@racunis/core` supports various events for job queues and workers to handle job states and errors effectively. Below is an overview of the events and how you can use them.

### Queue Events

These events are triggered by the queue during different stages of job processing.

- **activated**: Emitted when a job is activated.
- **completed**: Emitted when a job is completed.
- **failed**: Emitted when a job fails.
- **error**: Emitted when an error occurs.

```typescript
const queue = new MyDatabaseQueue('Queue', poolConfig)

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
```

### Worker Events

These events are triggered by the worker while processing jobs.

- **waiting**: Emitted when the worker is waiting for a job.
- **activated**: Emitted when a job is activated.
- **completed**: Emitted when a job is completed.
- **failed**: Emitted when a job fails.

```typescript
const worker = new MyDatabaseWorker(queue, (job) => {
  console.log('Processing job:', job.payload.task)
})

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
```

## Queue and Worker Control

`@racunis/core` provides mechanisms to control the execution of queues and workers, as well as methods to manage the state of jobs in the queue.

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

`@racunis/core` provides methods to manage the jobs in the queue:

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
