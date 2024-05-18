/* eslint-disable no-console */

import type { Job } from '@racunis/core'
import { PostgreSqlQueue, PostgreSqlWorker } from '@racunis/postgresql'
import dotenv from 'dotenv'

import type { JobPayload } from './types'

// Load environment variables from the .env file
dotenv.config({ path: '../.env' })

const main = async () => {
  // Create a PostgreSqlQueue instance with the specified connection details
  const queue = await PostgreSqlQueue.create<JobPayload>('Queue', {
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    port: Number(process.env.POSTGRESQL_PORT),
  })

  // Event listener for when a job is activated
  queue.on('activated', ({ job }) => {
    console.log(`[Queue] Job activated: ${job.id}`)
  })

  let completedJobs = 0

  // Event listener for when a job is completed
  queue.on('completed', ({ job }) => {
    console.log(`[Queue] Job completed: ${job.id}`)
    completedJobs++
    // Close the queue if all jobs are completed
    if (completedJobs === jobs.length) {
      void queue.close()
    }
  })

  // Event listener for when a job fails
  queue.on('failed', ({ job, error }) => {
    console.log(`[Queue] Job failed: ${job.id}, Error: ${error.message}`)
  })

  // Event listener for queue errors
  queue.on('error', ({ error }) => {
    console.error(`[Queue] Error: ${error.message}`)
  })

  // Add jobs to the queue with different priorities
  const jobs = [
    queue.add({ type: 'EmailProcessing', details: { recipient: 'user@example.com', content: 'Hello, World!' } }, 5),
    queue.add({ type: 'DataMigration', details: { source: 'System A', destination: 'System B' } }, 3),
    queue.add({ type: 'ReportGeneration', details: { reportId: 'R123', requestedBy: 'admin' } }, 4),
  ]

  // Function to process each job based on its type
  const processJob = (job: Job<JobPayload>) => {
    const { type, details } = job.payload
    switch (type) {
      case 'EmailProcessing': {
        console.log(`Processing Email Job ${job.id}: Recipient - ${details.recipient}, Content - ${details.content}`)
        break
      }
      case 'DataMigration': {
        console.log(`Processing Data Migration Job ${job.id}: Source - ${details.source}, Destination - ${details.destination}`)
        break
      }
      case 'ReportGeneration': {
        console.log(`Processing Report Generation Job ${job.id}: Report ID - ${details.reportId}, Requested By - ${details.requestedBy}`)
        break
      }
    }
  }

  // Create a PostgreSqlWorker to process the jobs
  const worker = PostgreSqlWorker.create(queue, processJob, { autostart: false })

  // Event listener for when the worker is waiting for a job
  worker.on('waiting', () => {
    console.log('[Worker] Waiting for a job...')
  })

  // Event listener for when a job is activated
  worker.on('activated', ({ job }) => {
    console.log(`[Worker] Job activated: ${job.id}`)
  })

  // Event listener for when a job is completed
  worker.on('completed', ({ job }) => {
    console.log(`[Worker] Job completed: ${job.id}`)
  })

  // Event listener for when a job fails
  worker.on('failed', ({ job, error }) => {
    console.log(`[Worker] Job failed: ${job.id}, Error: ${error.message}`)
  })

  // Start the worker to begin processing jobs
  worker.start()
}

// Execute the main function and catch any errors
try {
  await main()
}
catch (error) {
  console.error(error)
}
