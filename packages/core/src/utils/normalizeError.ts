/**
 * Normalizes an unknown error to an instance of Error.
 * If the input is already an Error, it is returned as is.
 * Otherwise, it creates a new Error instance with the string representation of the input.
 *
 * @param {unknown} error - The input error to normalize.
 * @returns {Error} - The normalized Error instance.
 * @example
 * const normalizedError = normalizeError(someError);
 * console.error(normalizedError.message);
 */
export const normalizeError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))
