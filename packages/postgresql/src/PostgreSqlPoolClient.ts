import type { Job } from '@racunis/core'
import { AbstractDatabasePoolClient, AcquirableJobNotFoundError, JobNotFoundError, JobState } from '@racunis/core'
import type pg from 'pg'

/**
 * Enum representing PostgreSQL error codes.
 */
enum ErrorCode {
  UniqueViolation = '23505',
  DuplicateObject = '42710',
}

/**
 * PostgreSqlPoolClient class that extends AbstractDatabasePoolClient for PostgreSQL.
 *
 * @template TPayload - The type of the job payload.
 * @extends AbstractDatabasePoolClient<pg.PoolClient, TPayload>
 */
export class PostgreSqlPoolClient<TPayload> extends AbstractDatabasePoolClient<pg.PoolClient, TPayload> {
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
   * Initializes the queue data by creating necessary tables and functions.
   *
   * @returns {Promise<void>}
   */
  async initQueueData(): Promise<void> {
    const statesList = Object.values(JobState).map(state => `'${state}'`).join(', ')
    const createJobStateEnumQuery = `
      CREATE TYPE job_state AS ENUM (${statesList});
    `
    const createQueueTableQuery = `
      CREATE TABLE IF NOT EXISTS "${this.queueName}" (
          id SERIAL PRIMARY KEY,
          payload JSON NOT NULL,
          state job_state NOT NULL,
          priority INTEGER NOT NULL,
          "errorMessage" TEXT,
          "createdAt" TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_queue_priority_order
      ON "${this.queueName}" (
          state,
          priority DESC,
          "createdAt" ASC,
          id ASC
      );
    `
    const createOrReplaceUpdateModifiedColumnFunctionQuery = `
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
    const createUpdateModifiedColumnTrigger = `
      CREATE TRIGGER update_modified_column_trigger
      BEFORE UPDATE ON "${this.queueName}"
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `

    await this.#executeQueryWithExpectedErrors(createJobStateEnumQuery, ErrorCode.UniqueViolation, ErrorCode.DuplicateObject)
    await this.#executeQueryWithExpectedErrors(createQueueTableQuery, ErrorCode.UniqueViolation)
    await this.#executeQueryWithExpectedErrors(createIndexQuery, ErrorCode.UniqueViolation)
    await this.#executeQueryWithExpectedErrors(createOrReplaceUpdateModifiedColumnFunctionQuery, ErrorCode.UniqueViolation)
    await this.#executeQueryWithExpectedErrors(createUpdateModifiedColumnTrigger, ErrorCode.DuplicateObject)
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
        FROM "${this.queueName}"
        WHERE state = $1
        ORDER BY priority DESC, "createdAt", id
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
      `
      const parameters = [JobState.waiting]
      const { rows: [waitingJob] } = await this.client.query<Job<TPayload> & { errorMessage: string | null }>(query, parameters)
      if (!waitingJob) {
        throw new AcquirableJobNotFoundError()
      }

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
    const query = `
      INSERT INTO "${this.queueName}"
      (payload, state, priority)
      VALUES ($1, $2, $3)
      RETURNING *;
    `
    const parameters = [JSON.stringify(payload), state, priority]
    const { rows: [job] } = await this.client.query<Job<TPayload> & { errorMessage: string | null }>(query, parameters)

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
    const query = `
      UPDATE "${this.queueName}"
      SET state = $1, "errorMessage" = $2
      WHERE id = $3
      RETURNING *;
    `
    const parameters = [state, errorMessage, id]
    const { rows: [job] } = await this.client.query<Job<TPayload> & { errorMessage: string | null }>(query, parameters)
    if (!job) {
      throw new JobNotFoundError({ id })
    }

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
      DELETE FROM "${this.queueName}"
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
    const stateCountsSQL = states.map((state, index) =>
      `COALESCE(SUM(CASE WHEN state = $${index + 1} THEN 1 ELSE 0 END), 0)::int AS "${state}"`,
    ).join(', ')
    const query = `
      SELECT ${stateCountsSQL}
      FROM "${this.queueName}";
    `
    const parameters = states
    const result = await this.client.query<{ [key in JobState]: number }>(query, parameters)

    return result.rows[0]
  }

  /**
   * Begins a transaction.
   *
   * @returns {Promise<void>}
   */
  async beginTransaction(): Promise<void> {
    await this.client.query('BEGIN;')
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
