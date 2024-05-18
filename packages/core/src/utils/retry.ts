import { setTimeout } from 'node:timers/promises'

import { normalizeError } from './normalizeError'

/**
 * Error thrown when a function fails after the maximum number of retries.
 */
export class MaxRetriesError extends Error {
  /**
   * Creates an instance of MaxRetriesError.
   * @param {number} retries - The number of retries attempted.
   * @param {Error} error - The last error encountered.
   */
  constructor(retries: number, error: Error) {
    super(`Function failed after ${retries} retries: ${error.message}`)
    this.name = 'MaxRetriesError'
    this.stack = error.stack
  }
}

/**
 * Retries a function a specified number of times with an optional delay between attempts.
 *
 * @template TResult
 * @param {() => Promise<TResult> | TResult} function_ - The function to retry.
 * @param {number} maxRetries - The maximum number of retry attempts.
 * @param {number} [delayInterval=0] - The delay interval between attempts in milliseconds.
 * @returns {Promise<TResult>} - The result of the function if it succeeds within the retry limit.
 * @throws {MaxRetriesError} If the function fails after the maximum number of retries.
 * @example
 * const result = await retry(() => fetchData(), 3, 1000);
 */
export const retry = <TResult>(
  function_: () => Promise<TResult> | TResult,
  maxRetries: number,
  delayInterval: number = 0,
): Promise<TResult> => {
  const attempt = async (currentAttempt: number): Promise<TResult> => {
    try {
      return await Promise.resolve(function_())
    }
    catch (error) {
      if (currentAttempt >= maxRetries) {
        throw new MaxRetriesError(maxRetries, normalizeError(error))
      }
      if (delayInterval > 0) {
        await setTimeout(delayInterval)
      }

      return attempt(currentAttempt + 1)
    }
  }

  return attempt(1)
}
