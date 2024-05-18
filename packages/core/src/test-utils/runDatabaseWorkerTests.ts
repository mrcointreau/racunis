import { v4 as uuidv4 } from 'uuid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AbstractDatabaseQueue } from '../AbstractDatabaseQueue'
import { AbstractDatabaseWorker } from '../AbstractDatabaseWorker'
import type { Job } from '../types'
import { JobState } from '../types'
import { MaxRetriesError } from '../utils/retry'

import { compareJobs } from './compareJobs'
import type { DatabaseQueue, DatabaseWorker } from './types'

export const runDatabaseWorkerTests = <TPoolConfig, TPool, TPoolClient>(
  poolConfig: TPoolConfig,
  DatabaseQueueClass: DatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>,
  DatabaseWorkerClass: DatabaseWorker<TPoolConfig, TPool, TPoolClient, unknown>,
) => {
  describe('DatabaseWorker', () => {
    const job = {
      payload: {},
      priority: AbstractDatabaseQueue.defaultJobPriority,
    }

    describe('Instantiation', () => {
      let queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>
      let worker: AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, unknown>

      beforeEach(async () => {
        const queueName = uuidv4()
        queue = await DatabaseQueueClass.create(queueName, poolConfig)
      })

      afterEach(async () => {
        await queue.stop()
        await queue.empty()
        await queue.close()
      })

      it('should automatically start the worker with default options', () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        expect(worker.isRunning()).toBe(true)
      })

      it('should automatically start the worker when autostart is set to true', () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor, { autostart: true })
        expect(worker.isRunning()).toBe(true)
      })

      it('should not automatically start the worker when autostart is set to false', () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor, { autostart: false })
        expect(worker.isRunning()).toBe(false)
      })

      it('should not automatically start a new worker if created on a stopped queue', async () => {
        await queue.stop()
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        expect(worker.isRunning()).toBe(false)
      })
    })

    describe('Start and stop', () => {
      let queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>
      let worker: AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, unknown>

      beforeEach(async () => {
        const queueName = uuidv4()
        queue = await DatabaseQueueClass.create(queueName, poolConfig)
      })

      afterEach(async () => {
        await queue.stop()
        await queue.empty()
        await queue.close()
      })

      it('should start the worker when the start method is called', () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor, { autostart: false })
        worker.start()
        expect(worker.isRunning()).toBe(true)
      })

      it('should stop the worker when the stop method is called', async () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        await worker.stop()
        expect(worker.isRunning()).toBe(false)
      })

      it('should be idempotent when the start method is called multiple times', () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        worker.start()
        worker.start()
        expect(worker.isRunning()).toBe(true)
      })

      it('should be idempotent when the stop method is called multiple times', async () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        await worker.stop()
        await worker.stop()
        expect(worker.isRunning()).toBe(false)
      })

      it('should prevent manual starting of the worker when its queue is stopped', async () => {
        await queue.stop()
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor, { autostart: false })
        worker.start()
        expect(worker.isRunning()).toBe(false)
      })

      it('should automatically start the worker when its previously stopped queue is restarted', async () => {
        await queue.stop()
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        await queue.start()
        expect(worker.isRunning()).toBe(true)
      })
    })

    describe('Jobs processing events', () => {
      let queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>
      let worker: AbstractDatabaseWorker<TPoolConfig, TPool, TPoolClient, unknown>

      beforeEach(async () => {
        const queueName = uuidv4()
        queue = await DatabaseQueueClass.create(queueName, poolConfig)
      })

      afterEach(async () => {
        await queue.stop()
        await queue.empty()
        await queue.close()
      })

      it(`should emit a 'waiting' event when no jobs are available for processing`, async () => {
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        const isWaiting = await new Promise<boolean>(resolve => worker.on('waiting', () => resolve(true)))
        expect(isWaiting).toBe(true)
      })

      it(`should emit a 'activated' event when acquiring a job to process`, async () => {
        const waitingJob = await queue.add(job.payload, job.priority)
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        const [activatedJob1, activatedJob2] = await Promise.all([
          new Promise<Job<unknown>>(resolve => queue.on('activated', ({ job }) => resolve(job))),
          new Promise<Job<unknown>>(resolve => worker.on('activated', ({ job }) => resolve(job))),
        ])
        expect(activatedJob1).toEqual(activatedJob2)
        expect(activatedJob1.state).toBe(JobState.active)
        expect(activatedJob1.updatedAt.getTime()).toBeGreaterThanOrEqual(waitingJob.updatedAt.getTime())
        expect(processor).toHaveBeenCalledWith({
          ...waitingJob,
          state: JobState.active,
          updatedAt: activatedJob1.updatedAt,
        })
      })

      it(`should emit a 'completed' event when successfully processing a job`, async () => {
        const waitingJob = await queue.add(job.payload, job.priority)
        const processor = vi.fn()
        worker = DatabaseWorkerClass.create(queue, processor)
        const [completedJob1, completedJob2] = await Promise.all([
          new Promise<Job<unknown>>(resolve => queue.on('completed', ({ job }) => resolve(job))),
          new Promise<Job<unknown>>(resolve => worker.on('completed', ({ job }) => resolve(job))),
        ])
        expect(completedJob1).toEqual(completedJob2)
        expect(completedJob1.state).toBe(JobState.completed)
        expect(completedJob1.updatedAt.getTime()).toBeGreaterThanOrEqual(waitingJob.updatedAt.getTime())
      })

      it(`should emit a 'failed' event when encountering an error while processing a job`, async () => {
        const waitingJob = await queue.add(job.payload, job.priority)
        const error = new Error('Test error')
        const processor = vi.fn().mockRejectedValue(error)
        worker = DatabaseWorkerClass.create(queue, processor)
        const [failed1, failed2] = await Promise.all([
          new Promise<{ job: Job<unknown>, error: Error }>(
            resolve => queue.on('failed', ({ job, error }) => resolve({ job, error })),
          ),
          new Promise<{ job: Job<unknown>, error: Error }>(
            resolve => worker.on('failed', ({ job, error }) => resolve({ job, error })),
          ),
        ])
        expect(failed1).toEqual(failed2)
        expect(failed1.job.state).toBe(JobState.failed)
        expect(failed1.job.updatedAt.getTime()).toBeGreaterThanOrEqual(waitingJob.updatedAt.getTime())
        expect(failed1.error.message).toEqual(
          new MaxRetriesError(AbstractDatabaseWorker.defaultOptions.maxRetries, error).message,
        )
      })
    })

    describe('Jobs processing', () => {
      let queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>

      beforeEach(async () => {
        const queueName = uuidv4()
        queue = await DatabaseQueueClass.create(queueName, poolConfig)
      })

      afterEach(async () => {
        await queue.stop()
        await queue.empty()
        await queue.close()
      })

      it('should ensure that jobs are processed in the order determined by their priority and creation time', async () => {
        const jobsNumber = 100
        const jobs = []
        for (let index = 0; index < jobsNumber; index++) {
          jobs.push(await queue.add(job.payload, Math.floor(Math.random() * 5) + 1))
        }

        const processor = vi.fn()
        const worker = DatabaseWorkerClass.create(queue, processor)

        const completedJobs: { id: number, priority: number, createdAt: Date }[] = []
        await new Promise<void>(resolve =>
          worker.on('completed', ({ job }) => {
            completedJobs.push({ id: job.id, priority: job.priority, createdAt: job.createdAt })
            if (completedJobs.length === jobs.length) {
              resolve()
            }
          }),
        )
        expect(completedJobs).toEqual(jobs.sort(compareJobs).map(
          ({ id, priority, createdAt }) => ({ id, priority, createdAt }),
        ))
      })
    })
  })
}
