import type { Job } from '@racunis/core'
import { AbstractDatabasePoolClient, AcquirableJobNotFoundError, JobNotFoundError, JobState } from '@racunis/core'
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'

/**
 * Enum representing MySQL error codes.
 */
enum ErrorCode {
  UniqueViolation = 'ER_DUP_ENTRY',
  DuplicateObject = 'ER_DUP_KEYNAME',
}

/**
 * MySqlPoolClient class that extends AbstractDatabasePoolClient for MySQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabasePoolClient<PoolConnection, TPayload>
 */
export class MySqlPoolClient<TPayload> extends AbstractDatabasePoolClient<PoolConnection, TPayload> {
  /**
   * Executes a query and ignores specified expected error codes.
   *
   * @private
   * @param {string} query - The SQL query to execute.
   * @param {string[]} expectedErrorCodes - The list of expected error codes to ignore.
   * @returns {Promise<void>}
   */
  async #executeQueryWithExpectedErrors(query: string, ...expectedErrorCodes: string[]): Promise<void> {
    try {
      await this.client.query(query)
    }
    catch (error) {
      if (!expectedErrorCodes.includes((error as { code: ErrorCode }).code)) {
        throw error
      }
    }
  }

  /**
   * Releases the client back to the pool.
   */
  release(): void {
    this.client.release()
  }

  /**
   * Initializes the queue data by creating necessary tables and indexes.
   *
   * @returns {Promise<void>}
   */
  async initQueueData(): Promise<void> {
    const statesList = Object.values(JobState).map(state => `'${state}'`).join(', ')
    const createQueueTableQuery = `
      CREATE TABLE IF NOT EXISTS \`${this.queueName}\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          payload JSON NOT NULL,
          state ENUM(${statesList}) NOT NULL,
          priority INT NOT NULL,
          errorMessage TEXT,
          createdAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
          updatedAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      );
    `
    const createIndexQuery = `
      CREATE INDEX idx_queue_priority_order
      ON \`${this.queueName}\` (
          state,
          priority DESC,
          createdAt ASC,
          id ASC
      );
    `
    await this.#executeQueryWithExpectedErrors(createQueueTableQuery, ErrorCode.UniqueViolation)
    await this.#executeQueryWithExpectedErrors(createIndexQuery, ErrorCode.DuplicateObject)
  }

  /**
   * Acquires the next available job in the waiting state and marks it as active.
   *
   * @returns {Promise<Job<TPayload>>} - The acquired job.
   * @throws {AcquirableJobNotFoundError} If no job in the waiting state is found.
   */
  async acquireJob(): Promise<Job<TPayload>> {
    try {
      await this.beginTransaction()
      const query = `
        SELECT *
        FROM \`${this.queueName}\`
        WHERE state = ?
        ORDER BY priority DESC, createdAt, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `
      const parameters = [JobState.waiting]
      const [rows] = await this.client.query<RowDataPacket[]>(query, parameters)
      if (rows.length === 0) {
        throw new AcquirableJobNotFoundError()
      }

      const waitingJob = rows[0] as Job<TPayload> & { errorMessage: string | null }
      const activeJob = await this.updateJobStateById(waitingJob.id, JobState.active)
      await this.commitTransaction()

      return { ...activeJob, errorMessage: activeJob.errorMessage || undefined }
    }
    catch (error) {
      await this.rollbackTransaction()

      throw error
    }
  }

  /**
   * Inserts a new job into the queue.
   *
   * @param {TPayload} payload - The job payload.
   * @param {JobState} state - The state of the job.
   * @param {number} priority - The priority of the job.
   * @returns {Promise<Job<TPayload>>} - The inserted job.
   * @example
   * const job = await client.insertJob({ task: 'processData' }, 'waiting', 10);
   */
  async insertJob(payload: TPayload, state: JobState, priority: number): Promise<Job<TPayload>> {
    const insertQuery = `
      INSERT INTO \`${this.queueName}\`
      (payload, state, priority)
      VALUES (?, ?, ?);
    `
    const insertParameters = [JSON.stringify(payload), state, priority]
    const [resultSetHeader] = await this.client.query<ResultSetHeader>(insertQuery, insertParameters)

    const selectQuery = `
      SELECT * FROM \`${this.queueName}\`
      WHERE id = ?;
    `
    const selectParameters = [resultSetHeader.insertId]
    const [rows] = await this.client.query<RowDataPacket[]>(selectQuery, selectParameters)
    const job = rows[0] as Job<TPayload> & { errorMessage: string | null }

    return { ...job, errorMessage: job.errorMessage || undefined }
  }

  /**
   * Updates the state of a job by its ID.
   *
   * @param {number} id - The ID of the job.
   * @param {JobState} state - The new state of the job.
   * @param {string} [errorMessage] - An optional error message if the job failed.
   * @returns {Promise<Job<TPayload>>} - The updated job.
   * @throws {JobNotFoundError} If no job with the specified ID is found.
   * @example
   * const job = await client.updateJobStateById(1, 'completed');
   */
  async updateJobStateById(id: number, state: JobState, errorMessage?: string): Promise<Job<TPayload>> {
    const updateQuery = `
      UPDATE \`${this.queueName}\`
      SET state = ?, errorMessage = ?
      WHERE id = ?;
    `
    const updateParameters = [state, errorMessage, id]
    await this.client.query<RowDataPacket[]>(updateQuery, updateParameters)

    const selectQuery = `
      SELECT * FROM \`${this.queueName}\`
      WHERE id = ?;
    `
    const selectParameters = [id]
    const [rows] = await this.client.query<RowDataPacket[]>(selectQuery, selectParameters)
    if (rows.length === 0) {
      throw new JobNotFoundError({ id })
    }
    const job = rows[0] as Job<TPayload> & { errorMessage: string | null }

    return { ...job, errorMessage: job.errorMessage || undefined }
  }

  /**
   * Deletes jobs in the specified states.
   *
   * @template TJobState
   * @param {...TJobState} states - The job states to delete.
   * @returns {Promise<void>}
   * @example
   * await client.deleteJobsByState('waiting', 'completed');
   */
  async deleteJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<void> {
    const statesList = states.map(state => `'${state}'`).join(', ')
    const query = `
      DELETE FROM \`${this.queueName}\`
      WHERE state IN (${statesList});
    `
    await this.client.query(query)
  }

  /**
   * Counts the number of jobs in the specified states.
   *
   * @template TJobState
   * @param {...TJobState} states - The job states to count.
   * @returns {Promise<{ [key in TJobState]: number }>} - The count of jobs in each state.
   * @example
   * const jobCounts = await client.countJobsByState('waiting', 'active');
   */
  async countJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<{ [key in TJobState]: number }> {
    const stateCountsSQL = states.map(state =>
      `CAST(SUM(CASE WHEN state = ? THEN 1 ELSE 0 END) AS SIGNED) AS ${state}`,
    ).join(', ')
    const query = `
      SELECT ${stateCountsSQL}
      FROM \`${this.queueName}\`;
    `
    const parameters = states
    const [rows] = await this.client.query<RowDataPacket[]>(query, parameters)

    return rows[0] as { [key in JobState]: number }
  }

  /**
   * Begins a transaction.
   *
   * @returns {Promise<void>}
   */
  async beginTransaction(): Promise<void> {
    await this.client.query('START TRANSACTION;')
  }

  /**
   * Commits a transaction.
   *
   * @returns {Promise<void>}
   */
  async commitTransaction(): Promise<void> {
    await this.client.query('COMMIT;')
  }

  /**
   * Rolls back a transaction.
   *
   * @returns {Promise<void>}
   */
  async rollbackTransaction(): Promise<void> {
    await this.client.query('ROLLBACK;')
  }
}
