import type { Job } from '../types'

/**
 * Compares two jobs based on their priority, creation time, and ID.
 *
 * @template TPayload
 * @param {Job<TPayload>} a - The first job to compare.
 * @param {Job<TPayload>} b - The second job to compare.
 * @returns {number} - A negative number if job `a` should come before job `b`,
 *                     a positive number if job `a` should come after job `b`,
 *                     or 0 if they are considered equal.
 *
 * @example
 * const job1 = { id: 1, priority: 5, createdAt: new Date('2023-01-01') };
 * const job2 = { id: 2, priority: 10, createdAt: new Date('2023-01-02') };
 * const comparison = compareJobs(job1, job2);
 * console.log(comparison); // Output: 5 (because job2 has higher priority)
 */
export const compareJobs = <TPayload>(a: Job<TPayload>, b: Job<TPayload>): number => {
  if (a.priority !== b.priority) {
    return b.priority - a.priority
  }

  if (a.createdAt.getTime() !== b.createdAt.getTime()) {
    return a.createdAt.getTime() - b.createdAt.getTime()
  }

  return a.id - b.id
}
