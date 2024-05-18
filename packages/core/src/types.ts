import EventTarget from 'node:events'

/**
 * Enum representing the possible states of a job.
 */
export const JobState = {
  waiting: 'waiting' as const,
  active: 'active' as const,
  completed: 'completed' as const,
  failed: 'failed' as const,
}

export type JobState = typeof JobState[keyof typeof JobState]

/**
 * Interface representing a job with a payload.
 *
 * @template TPayload
 */
export interface Job<TPayload> {
  id: number
  payload: TPayload
  state: JobState
  priority: number
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Type representing a job processor function.
 *
 * @template TPayload
 * @param {Job<TPayload>} job - The job to process.
 * @returns {void | Promise<void>} - Can return a void or a Promise that resolves to void.
 */
export type JobProcessor<TPayload> = (job: Job<TPayload>) => void | Promise<void>

/**
 * TypedEventTarget class extending EventTarget to provide type-safe events.
 *
 * @template TEvent - The shape of the event map.
 */
export class TypedEventTarget<TEvent extends Record<string | symbol, unknown[]>> extends EventTarget {
  /**
   * Emits an event with the specified arguments.
   *
   * @template E - The event type key.
   * @param {E} event - The event type to emit.
   * @param {...TEvent[E]} arguments_ - The arguments to pass with the event.
   * @returns {boolean} - True if the event had listeners, false otherwise.
   */
  emit<E extends keyof TEvent>(event: E, ...arguments_: TEvent[E]): boolean {
    return super.emit(event as string | symbol, ...arguments_)
  }

  /**
   * Registers an event listener for the specified event type.
   *
   * @template E - The event type key.
   * @param {E} event - The event type to listen for.
   * @param {(...arguments_: TEvent[E]) => void} listener - The event listener function.
   * @returns {this} - The TypedEventTarget instance.
   */
  on<E extends keyof TEvent>(event: E, listener: (...arguments_: TEvent[E]) => void): this {
    return super.on(event as string | symbol, listener as (...arguments_: unknown[]) => void)
  }
}
