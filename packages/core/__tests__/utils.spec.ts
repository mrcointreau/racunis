import { describe, expect, it, vi } from 'vitest'

import { normalizeError } from '../src/utils/normalizeError'
import { retry } from '../src/utils/retry'

describe('normalizeError', () => {
  it('should return the same Error object when an instance of Error is provided', () => {
    const error = new Error('Test error')
    const normalizedError = normalizeError(error)
    expect(normalizedError).toBe(error)
  })

  it('should generate a new Error object from a string input', () => {
    const errorString = 'An error occurred'
    const normalizedError = normalizeError(errorString)
    expect(normalizedError).toBeInstanceOf(Error)
    expect(normalizedError.message).toBe(errorString)
  })

  it('should generate a new Error object from a numeric input', () => {
    const errorNumber = 404
    const normalizedError = normalizeError(errorNumber)
    expect(normalizedError).toBeInstanceOf(Error)
    expect(normalizedError.message).toBe(String(errorNumber))
  })

  it('should generate a new Error object from an object input', () => {
    const errorObject = { key: 'value' }
    const normalizedError = normalizeError(errorObject)
    expect(normalizedError).toBeInstanceOf(Error)
    expect(normalizedError.message).toBe(String(errorObject))
  })

  it('should generate a new Error object from null input', () => {
    // eslint-disable-next-line unicorn/no-null
    const normalizedError = normalizeError(null)
    expect(normalizedError).toBeInstanceOf(Error)
    expect(normalizedError.message).toBe('null')
  })

  it('should generate a new Error object from undefined input', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    const normalizedError = normalizeError(undefined)
    expect(normalizedError).toBeInstanceOf(Error)
    expect(normalizedError.message).toBe('undefined')
  })
})

const mockFunction = (shouldFailTimes: number) => {
  let calls = 0

  return vi.fn(() => {
    calls++
    if (calls <= shouldFailTimes) {
      throw new Error(`Fail ${calls}`)
    }

    return 'Success'
  })
}

describe('retry', () => {
  it('should retry the function the specified number of times and resolve upon success', async () => {
    const function_ = mockFunction(2)
    const result = await retry(function_, 3)
    expect(result).toBe('Success')
    expect(function_).toHaveBeenCalledTimes(3)
  })

  it('should reject with an error message if all retries are exhausted without success', async () => {
    const function_ = mockFunction(3)
    await expect(retry(function_, 3)).rejects.toThrow('Function failed after 3 retries: Fail 3')
    expect(function_).toHaveBeenCalledTimes(3)
  })

  it('should appropriately handle a specified delay between retries', async () => {
    vi.useFakeTimers()
    const function_ = mockFunction(1)
    const promise = retry(function_, 2, 100)
    vi.advanceTimersByTime(100)
    await expect(promise).resolves.toBe('Success')
    expect(function_).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('should properly manage synchronous functions that throw errors immediately', async () => {
    const error = new Error('Immediate failure')
    await expect(
      retry(() => { throw error }, 1),
    ).rejects.toThrow(`Function failed after 1 retries: ${error.message}`)
  })
})
