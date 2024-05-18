import { AbstractDatabasePoolClient, AcquirableJobNotFoundError, JobNotFoundError } from '../../src/AbstractDatabasePoolClient'
import { compareJobs } from '../../src/test-utils'
import type { Job } from '../../src/types'
import { JobState } from '../../src/types'

export class MockDatabasePoolClient<TPayload> extends AbstractDatabasePoolClient<unknown, TPayload> {
  static id: number = 1

  static jobs: Job<unknown>[] = []
  static lockedJobsIds: number[] = []

  release(): void {}

  initQueueData(): Promise<void> {
    return Promise.resolve()
  }

  insertJob(payload: TPayload, state: JobState, priority: number): Promise<Job<TPayload>> {
    const now = new Date()
    const waitingJob = {
      id: MockDatabasePoolClient.id++,
      payload,
      state,
      priority,
      createdAt: now,
      updatedAt: now,
    }
    MockDatabasePoolClient.jobs.push(waitingJob)

    return Promise.resolve({ ...waitingJob })
  }

  async acquireJob(): Promise<Job<TPayload>> {
    try {
      await this.beginTransaction()
      const waitingJob = MockDatabasePoolClient.jobs.sort(compareJobs).find(
        job => job.state === JobState.waiting && !MockDatabasePoolClient.lockedJobsIds.includes(job.id),
      )
      if (!waitingJob) {
        throw new AcquirableJobNotFoundError()
      }

      MockDatabasePoolClient.lockedJobsIds.push(waitingJob.id)
      const activeJob = await this.updateJobStateById(waitingJob.id, JobState.active)
      MockDatabasePoolClient.lockedJobsIds = MockDatabasePoolClient.lockedJobsIds.filter(id => id !== activeJob.id)
      await this.commitTransaction()

      return { ...activeJob }
    }
    catch (error) {
      await this.rollbackTransaction()

      throw error
    }
  }

  updateJobStateById(id: number, state: JobState, errorMessage?: string): Promise<Job<TPayload>> {
    const job = MockDatabasePoolClient.jobs.find(job => job.id === id)
    if (!job) {
      throw new JobNotFoundError({ id })
    }

    job.state = state
    job.errorMessage = errorMessage
    job.updatedAt = new Date()

    return Promise.resolve({ ...job }) as Promise<Job<TPayload>>
  }

  countJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<{ [key in TJobState]: number }> {
    return Promise.resolve(
      Object.fromEntries(
        states.map(state => [state, MockDatabasePoolClient.jobs.filter(job => job.state === state).length]),
      ) as { [key in TJobState]: number },
    )
  }

  deleteJobsByState<TJobState extends JobState>(
    ...states: [TJobState, ...TJobState[]]
  ): Promise<void> {
    MockDatabasePoolClient.jobs = MockDatabasePoolClient.jobs.filter(job => !(states as JobState[]).includes(job.state))

    return Promise.resolve()
  }

  beginTransaction(): Promise<void> {
    return Promise.resolve()
  }

  commitTransaction(): Promise<void> {
    return Promise.resolve()
  }

  rollbackTransaction(): Promise<void> {
    return Promise.resolve()
  }
}
