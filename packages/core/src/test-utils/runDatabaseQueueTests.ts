import { setTimeout } from 'node:timers/promises'

import { v4 as uuidv4 } from 'uuid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AbstractDatabaseQueue } from '../AbstractDatabaseQueue'
import type { Job } from '../types'
import { JobState } from '../types'

import type { DatabaseQueue, DatabaseWorker } from './types'

export const runDatabaseQueueTests = <TPoolConfig, TPool, TPoolClient>(
  poolConfig: TPoolConfig,
  DatabaseQueueClass: DatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>,
  DatabaseWorkerClass: DatabaseWorker<TPoolConfig, TPool, TPoolClient, unknown>,
) => {
  describe('DatabaseQueue', () => {
    const job = {
      payload: {},
      priority: AbstractDatabaseQueue.defaultJobPriority,
    }

    describe('Instantiation', () => {
      const queueName = uuidv4()

      it('should automatically start the queue with default options', async () => {
        const queue = await DatabaseQueueClass.create(queueName, poolConfig)
        expect(queue.isRunning()).toBe(true)

        await queue.close()
      })

      it('should automatically start the queue when autostart is set to true', async () => {
        const queue = await DatabaseQueueClass.create(queueName, poolConfig, { autostart: true })
        expect(queue.isRunning()).toBe(true)

        await queue.close()
      })

      it('should not automatically start the queue when autostart is set to false', async () => {
        const queue = await DatabaseQueueClass.create(queueName, poolConfig, { autostart: false })
        expect(queue.isRunning()).toBe(false)

        await queue.close()
      })

      it('should throw an error when attempting to create a duplicate queue', async () => {
        const queue = await DatabaseQueueClass.create(queueName, poolConfig)
        await expect(
          DatabaseQueueClass.create(queueName, poolConfig),
        ).rejects.toThrow(`Queue with name '${queueName}' already exists`)

        await queue.close()
      })
    })

    describe('Start and stop', () => {
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

      it('should start the queue when the start method is called', async () => {
        await queue.stop()
        await queue.start()
        expect(queue.isRunning()).toBe(true)
      })

      it('should stop the queue when the stop method is called', async () => {
        await queue.stop()
        expect(queue.isRunning()).toBe(false)
      })

      it('should be idempotent when the start method is called multiple times', async () => {
        await queue.start()
        expect(queue.isRunning()).toBe(true)
      })

      it('should be idempotent when the stop method is called multiple times', async () => {
        await queue.stop()
        await queue.stop()
        expect(queue.isRunning()).toBe(false)
      })
    })

    describe('Jobs creation', () => {
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

      it('should successfully add a job to the queue', async () => {
        const waitingJob = await queue.add(job.payload, job.priority)
        expect(waitingJob).toEqual({
          id: 1,
          payload: job.payload,
          state: JobState.waiting,
          priority: job.priority,
          createdAt: waitingJob.createdAt,
          updatedAt: waitingJob.updatedAt,
        })
      })

      it('should use the default job priority when none is provided', async () => {
        const waitingJob = await queue.add(job.payload)
        expect(waitingJob).toEqual({
          id: 1,
          payload: job.payload,
          state: JobState.waiting,
          priority: AbstractDatabaseQueue.defaultJobPriority,
          createdAt: waitingJob.createdAt,
          updatedAt: waitingJob.updatedAt,
        })
      })
    })

    describe('Jobs management', () => {
      let queue: AbstractDatabaseQueue<TPoolConfig, TPool, TPoolClient, unknown>

      beforeEach(async () => {
        const queueName = uuidv4()
        queue = await DatabaseQueueClass.create(queueName, poolConfig)
        await Promise.all([
          queue.add(job.payload),
          queue.add(job.payload),
          queue.add(job.payload),
          queue.add(job.payload),
        ])
        const processor = vi.fn(async (job: Job<unknown>) => {
          if (job.id === 1) {
            throw new Error('Test error')
          }

          await setTimeout(1000)
        })
        const worker = DatabaseWorkerClass.create(queue, processor)
        await new Promise<void>(resolve =>
          worker.on('activated', ({ job }) => {
            if (job.id === 3) {
              vi.useFakeTimers()
              resolve()
            }
          }),
        )
      })

      afterEach(async () => {
        await queue.stop()
        await queue.empty()
        await queue.close()
        vi.useRealTimers()
      })

      it('should count jobs by state', async () => {
        const jobCounts = await queue.getJobCounts(
          JobState.waiting,
          JobState.active,
          JobState.completed,
          JobState.failed,
        )
        expect(jobCounts.waiting).toBe(1)
        expect(jobCounts.active).toBe(1)
        expect(jobCounts.completed).toBe(1)
        expect(jobCounts.failed).toBe(1)
      })

      it('should drain the queue', async () => {
        await queue.drain()
        const jobCounts = await queue.getJobCounts(
          JobState.waiting,
          JobState.active,
          JobState.completed,
          JobState.failed,
        )
        expect(jobCounts.waiting).toBe(0)
      })

      it('should empty the queue', async () => {
        await queue.stop()
        await queue.empty()
        const jobCounts = await queue.getJobCounts(
          JobState.waiting,
          JobState.active,
          JobState.completed,
          JobState.failed,
        )
        expect(jobCounts.waiting + jobCounts.active + jobCounts.completed + jobCounts.failed).toBe(0)
      })
    })
  })
}
