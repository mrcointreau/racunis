import type { AbstractDatabasePool } from './AbstractDatabasePool'
import type { AbstractDatabaseWorker } from './AbstractDatabaseWorker'
import type { Job } from './types'
import { JobState, TypedEventTarget } from './types'

/**
 * Events for the DatabaseQueue.
 *
 * @template TPayload - The type of the job payload.
 */
export type DatabaseQueueEvents<TPayload> = {
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

  /**
   * Event triggered when an error occurs.
   */
  error: [{ error: Error }]
}

/**
 * Options for the DatabaseQueue.
 */
export type DatabaseQueueOptions = {
  /**
   * Whether to automatically start the queue.
   */
  autostart: boolean
}

/**
 * Abstract class representing a database queue.
 * @template TPoolConfig - The type of the pool configuration.
 * @template TPool - The type of the pool.
 * @template TPoolClient - The type of the pool client.
 * @template TPayload - The type of the job payload.
 * @extends TypedEventTarget<DatabaseQueueEvents<TPayload>>
 */
export abstract class AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, TPayload>
  extends TypedEventTarget<DatabaseQueueEvents<TPayload>> {
  static defaultOptions: DatabaseQueueOptions = {
    autostart: true,
  }

  static #instances = new Map<string, unknown>()

  static defaultJobPriority = 5

  #workers = new Set<AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>>()

  #options: DatabaseQueueOptions

  #name: string

  #poolConfig: TPoolConfig

  #pool: AbstractDatabasePool<TPool, TPoolClient, TPayload>

  #running: boolean = false

  /**
   * Creates an instance of AbstractDatabaseQueue.
   * @param {string} name - The name of the queue.
   * @param {TPoolConfig} poolConfig - The pool configuration.
   * @param {Partial<DatabaseQueueOptions>} [options] - The options for the queue.
   * @throws Will throw an error if a queue with the same name already exists.
   */
  constructor(
    name: string,
    poolConfig: TPoolConfig,
    options?: Partial<DatabaseQueueOptions>,
  ) {
    super()
    if (AbstractDatabaseQueue.#instances.has(name)) {
      throw new Error(`Queue with name '${name}' already exists.`)
    }
    AbstractDatabaseQueue.#instances.set(name, this)
    this.#name = name
    this.#poolConfig = poolConfig
    this.#pool = this.createPool(poolConfig)
    this.#options = { ...AbstractDatabaseQueue.defaultOptions, ...options }
    if (this.#options.autostart) {
      void this.start()
    }
  }

  /**
   * Initializes the queue by setting up the necessary data structures in the database.
   * @returns {Promise<void>}
   */
  async initialize(): Promise<void> {
    const pool = this.createPool(this.#poolConfig)
    const client = await pool.getClient(this.#name)
    try {
      await client.initQueueData()
    }
    finally {
      client.release()
      await pool.close()
    }
  }

  /**
   * Creates a pool with the given configuration.
   * @abstract
   * @param {TPoolConfig} poolConfig - The pool configuration.
   * @returns {AbstractDatabasePool<TPool, TPoolClient, TPayload>}
   */
  abstract createPool(poolConfig: TPoolConfig): AbstractDatabasePool<TPool, TPoolClient, TPayload>

  /**
   * Returns the set of workers associated with the queue.
   * @returns {Set<AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>>}
   */
  getWorkers(): Set<AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, TPayload>> {
    return this.#workers
  }

  /**
   * Returns the name of the queue.
   * @returns {string}
   */
  getName(): string {
    return this.#name
  }

  /**
   * Returns the pool configuration.
   * @returns {TPoolConfig}
   */
  getPoolConfig(): TPoolConfig {
    return this.#poolConfig
  }

  /**
   * Checks if the queue is running.
   * @returns {boolean}
   */
  isRunning(): boolean {
    return this.#running
  }

  /**
   * Adds a job to the queue with the given payload and priority.
   * @param {TPayload} payload - The job payload.
   * @param {number} [priority=AbstractDatabaseQueue.defaultJobPriority] - The job priority.
   * @returns {Promise<Job<TPayload>>} - The added job.
   * @example
   * const job = await queue.add({ task: 'processData' }, 10);
   */
  async add(payload: TPayload, priority: number = AbstractDatabaseQueue.defaultJobPriority): Promise<Job<TPayload>> {
    const client = await this.#pool.getClient(this.#name)
    try {
      return client.insertJob(payload, JobState.waiting, priority)
    }
    finally {
      client.release()
    }
  }

  /**
   * Gets the count of jobs in the specified states.
   * @template TJobState
   * @param {...TJobState} states - The job states.
   * @returns {Promise<{ [key in TJobState]: number }>} - The count of jobs in each state.
   * @example
   * const jobCounts = await queue.getJobCounts('waiting', 'active');
   */
  async getJobCounts<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<{ [key in TJobState]: number }> {
    const client = await this.#pool.getClient(this.#name)
    try {
      return client.countJobsByState(...states)
    }
    finally {
      client.release()
    }
  }

  /**
   * Drains the queue by deleting all waiting jobs.
   * @returns {Promise<void>}
   */
  async drain(): Promise<void> {
    const client = await this.#pool.getClient(this.#name)
    try {
      return client.deleteJobsByState(JobState.waiting)
    }
    finally {
      client.release()
    }
  }

  /**
   * Empties the queue by deleting all jobs in all states.
   * @returns {Promise<void>}
   */
  async empty(): Promise<void> {
    const client = await this.#pool.getClient(this.#name)
    try {
      return client.deleteJobsByState(JobState.waiting, JobState.active, JobState.completed, JobState.failed)
    }
    finally {
      client.release()
    }
  }

  /**
   * Starts processing jobs in the queue.
   * @returns {Promise<void>}
   */
  async start(): Promise<void> {
    if (!this.#running) {
      this.#running = true
      await Promise.all([...this.#workers].map(worker => worker.start()))
    }
  }

  /**
   * Stops processing jobs in the queue.
   * @returns {Promise<void>}
   */
  async stop(): Promise<void> {
    if (this.#running) {
      this.#running = false
      await Promise.all([...this.#workers].map(worker => worker.stop()))
    }
  }

  /**
   * Closes the queue and releases all resources.
   * @returns {Promise<void>}
   */
  async close(): Promise<void> {
    this.#running = false
    await Promise.all([...this.#workers].map(worker => worker.close()))
    await this.#pool.close()

    AbstractDatabaseQueue.#instances.delete(this.#name)
  }
}
