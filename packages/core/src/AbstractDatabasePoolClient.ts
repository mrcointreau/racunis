import type { Job } from './types'
import { JobState } from './types'

/**
 * Error thrown when a job cannot be found.
 * @template TPayload - The type of the job payload.
 */
export class JobNotFoundError<TPayload> extends Error {
  /**
   * The details of the job that could not be found.
   * @type {Partial<Job<TPayload>>}
   */
  details: Partial<Job<TPayload>>

  /**
   * Creates an instance of JobNotFoundError.
   * @param {Partial<Job<TPayload>>} details - The details of the job that could not be found.
   */
  constructor(details: Partial<Job<TPayload>>) {
    super(`Couldn't find any job with details: ${JSON.stringify(details)}`)
    this.details = details
    this.name = 'JobNotFoundError'
  }
}

/**
 * Error thrown when an acquirable job cannot be found.
 * @template TPayload - The type of the job payload.
 * @extends JobNotFoundError<TPayload>
 */
export class AcquirableJobNotFoundError<TPayload> extends JobNotFoundError<TPayload> {
  /**
   * Creates an instance of AcquirableJobNotFoundError.
   */
  constructor() {
    super({ state: JobState.waiting })
    this.name = 'AcquirableJobNotFoundError'
  }
}

/**
 * Abstract class representing a database pool client.
 * @template TPoolClient - The type of the pool client.
 * @template TPayload - The type of the job payload.
 */
export abstract class AbstractDatabasePoolClient<TPoolClient, TPayload> {
  /**
   * The name of the queue.
   * @type {string}
   */
  queueName: string

  /**
   * The underlying client instance.
   * @protected
   * @type {TPoolClient}
   */
  protected client: TPoolClient

  /**
   * Creates an instance of AbstractDatabasePoolClient.
   * @param {TPoolClient} client - The underlying client instance.
   * @param {string} queueName - The name of the queue.
   */
  constructor(client: TPoolClient, queueName: string) {
    this.client = client
    this.queueName = queueName
  }

  /**
   * Releases the client back to the pool.
   * @abstract
   * @returns {void}
   */
  abstract release(): void

  /**
   * Initializes the queue data.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract initQueueData(): Promise<void>

  /**
   * Inserts a job into the queue.
   * @abstract
   * @param {TPayload} payload - The job payload.
   * @param {JobState} state - The state of the job.
   * @param {number} priority - The priority of the job.
   * @returns {Promise<Job<TPayload>>} - The inserted job.
   * @example
   * const job = await client.insertJob({ task: 'processData' }, 'waiting', 10);
   */
  abstract insertJob(payload: TPayload, state: JobState, priority: number): Promise<Job<TPayload>>

  /**
   * Acquires a job from the queue.
   * @abstract
   * @returns {Promise<Job<TPayload>>} - The acquired job.
   * @throws {AcquirableJobNotFoundError} If no acquirable job is found.
   * @example
   * const job = await client.acquireJob();
   */
  abstract acquireJob(): Promise<Job<TPayload>>

  /**
   * Updates the state of a job by its ID.
   * @abstract
   * @param {number} id - The ID of the job.
   * @param {JobState} state - The new state of the job.
   * @param {string} [errorMessage] - An optional error message if the job failed.
   * @returns {Promise<Job<TPayload>>} - The updated job.
   * @example
   * const job = await client.updateJobStateById(1, 'completed');
   */
  abstract updateJobStateById(id: number, state: JobState, errorMessage?: string): Promise<Job<TPayload>>

  /**
   * Counts the number of jobs in the specified states.
   * @abstract
   * @template TJobState
   * @param {...TJobState} states - The job states.
   * @returns {Promise<{ [key in TJobState]: number }>} - The count of jobs in each state.
   * @example
   * const jobCounts = await client.countJobsByState('waiting', 'active');
   */
  abstract countJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<{ [key in TJobState]: number }>

  /**
   * Deletes jobs in the specified states.
   * @abstract
   * @template TJobState
   * @param {...TJobState} states - The job states.
   * @returns {Promise<void>}
   * @example
   * await client.deleteJobsByState('waiting', 'completed');
   */
  abstract deleteJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<void>

  /**
   * Begins a transaction.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract beginTransaction(): Promise<void>

  /**
   * Commits a transaction.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract commitTransaction(): Promise<void>

  /**
   * Rolls back a transaction.
   * @abstract
   * @returns {Promise<void>}
   */
  abstract rollbackTransaction(): Promise<void>
}
