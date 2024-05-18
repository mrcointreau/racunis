import { setTimeout } from 'node:timers/promises'

import type { AbstractDatabasePool } from './AbstractDatabasePool'
import type { AbstractDatabasePoolClient } from './AbstractDatabasePoolClient'
import { AcquirableJobNotFoundError } from './AbstractDatabasePoolClient'
import type { AbstractDatabaseQueue } from './AbstractDatabaseQueue'
import type { Job, JobProcessor } from './types'
import { JobState, TypedEventTarget } from './types'
import { normalizeError } from './utils/normalizeError'
import { retry } from './utils/retry'

/**
 * Events for the DatabaseWorker.
 *
 * @template TPayload - The type of the job payload.
 */
export type DatabaseWorkerEvents<TPayload> = {
  /**
   * Event triggered when the worker is waiting for a job.
   */
  waiting: []

  /**
   * Event triggered when a job is activated.
   */
  activated: [{ job: Job<TPayload> }]

  /**
   * Event triggered when a job is completed.
   */
  completed: [{ job: Job<TPayload> }]

  /**
   * Event triggered when a job fails.
   */
  failed: [{ job: Job<TPayload>, error: Error }]
}

/**
 * Options for the DatabaseWorker.
 */
export type DatabaseWorkerOptions = {
  /**
   * Whether to automatically start the worker.
   */
  autostart: boolean

  /**
   * Interval in milliseconds between job processing.
   */
  processingInterval: number

  /**
   * Interval in milliseconds for checking for new jobs when the worker is waiting.
   */
  waitingInterval: number

  /**
   * Maximum number of retries for processing a job.
   */
  maxRetries: number

  /**
   * Interval in milliseconds between retry attempts.
   */
  retryInterval: number
}

/**
 * Abstract class representing a database worker.
 * @template TPoolConfig - The type of the pool configuration.
 * @template TPool - The type of the pool.
 * @template TPoolClient - The type of the pool client.
 * @template TPayload - The type of the job payload.
 * @extends TypedEventTarget<DatabaseWorkerEvents<TPayload>>
 */
export abstract class AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>
  extends TypedEventTarget<DatabaseWorkerEvents<TPayload>> {
  static defaultOptions: DatabaseWorkerOptions = {
    autostart: true, processingInterval: 0, waitingInterval: 1000, maxRetries: 3, retryInterval: 500,
  }

  #queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>

  #options: DatabaseWorkerOptions

  #pool: AbstractDatabasePool<TPool, TPoolClient, TPayload>

  #processor: JobProcessor<TPayload>

  #running: boolean = false

  #processJobsPromise?: Promise<void>

  /**
   * Creates an instance of AbstractDatabaseWorker.
   * @param {AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>} queue - The queue this worker will process jobs for.
   * @param {JobProcessor<TPayload>} processor - The job processor function.
   * @param {Partial<DatabaseWorkerOptions>} [options] - The options for the worker.
   */
  constructor(
    queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>,
    processor: JobProcessor<TPayload>,
    options?: Partial<DatabaseWorkerOptions>,
  ) {
    super()
    this.#pool = queue.createPool(queue.getPoolConfig())
    this.#queue = queue
    this.#queue.getWorkers().add(this)
    this.#options = { ...AbstractDatabaseWorker.defaultOptions, ...options }
    this.#processor = processor
    this.#processJobsPromise = undefined
    if (this.#options.autostart) {
      this.start()
    }
  }

  /**
   * Processes a single job.
   * @private
   * @param {AbstractDatabasePoolClient<TPoolClient, TPayload>} client - The pool client.
   * @returns {Promise<void>}
   */
  async #processJob(client: AbstractDatabasePoolClient<TPoolClient, TPayload>): Promise<void> {
    const activeJob = await client.acquireJob()
    this.emit('activated', { job: activeJob })
    this.#queue.emit('activated', { job: activeJob })
    try {
      await retry(() => this.#processor(activeJob), this.#options.maxRetries, this.#options.retryInterval)
      const completedJob = await client.updateJobStateById(activeJob.id, JobState.completed)
      this.emit('completed', { job: completedJob })
      this.#queue.emit('completed', { job: completedJob })
    }
    catch (error_) {
      const error = normalizeError(error_)
      const failedJob = await client.updateJobStateById(activeJob.id, JobState.failed, error.message)
      this.emit('failed', { job: failedJob, error })
      this.#queue.emit('failed', { job: failedJob, error })
    }
  }

  /**
   * Processes jobs in a loop while the worker is running.
   * @private
   * @returns {Promise<void>}
   */
  async #processJobs(): Promise<void> {
    while (this.#running) {
      try {
        await setTimeout(this.#options.processingInterval)
        const client = await this.#pool.getClient(this.#queue.getName())
        try {
          await this.#processJob(client)
        }
        finally {
          client.release()
        }
      }
      catch (error) {
        if (error instanceof AcquirableJobNotFoundError) {
          this.emit('waiting')
        }
        else {
          this.#queue.emit('error', { error: normalizeError(error) })
        }
        await setTimeout(this.#options.waitingInterval)
      }
    }
  }

  /**
   * Checks if the worker is running.
   * @returns {boolean}
   */
  isRunning(): boolean {
    return this.#running
  }

  /**
   * Starts the worker, beginning job processing.
   * @returns {void}
   */
  start(): void {
    if (!this.#queue.isRunning() || this.#running) {
      return
    }

    this.#running = true
    this.#processJobsPromise = this.#processJobs()
  }

  /**
   * Stops the worker, halting job processing.
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (!this.#running) {
      return
    }

    this.#running = false
    await this.#processJobsPromise
    this.#processJobsPromise = undefined
  }

  /**
   * Closes the worker, releasing all resources.
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    await this.stop()
    await this.#pool.close()

    this.#queue.getWorkers().delete(this)
  }
}
