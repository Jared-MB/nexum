type Result<T, E = unknown> =
	| [error: E, data: undefined]
	| [error: undefined, data: T];

/**
 * Wrapper class that provides chainable error handling for async operations
 * Implements PromiseLike to be directly awaitable
 */
class TryCatchChain<T, E = Error> implements PromiseLike<Result<T, E>> {
	constructor(private promise: Promise<Result<T, E>>) {}

	/**
	 * Chain another async operation that depends on the previous result
	 * @param fn Function that takes the previous result and returns a new promise
	 * @returns New TryCatchChain for further chaining
	 */
	andThen<U>(fn: (data: T) => Promise<U>): TryCatchChain<U, E> {
		const newPromise = this.promise.then(async ([error, data]) => {
			if (error !== undefined) {
				return [error, undefined] as Result<U, E>;
			}

			if (data === undefined) {
				return [undefined, undefined] as Result<U, E>;
			}

			try {
				const result = await fn(data);
				return [undefined, result] as Result<U, E>;
			} catch (newError: unknown) {
				return [newError as E, undefined] as Result<U, E>;
			}
		});

		return new TryCatchChain(newPromise);
	}

	/**
	 * Transform the successful result without changing error handling
	 * @param fn Synchronous transformation function
	 * @returns New TryCatchChain with transformed result
	 */
	map<U>(fn: (data: T) => U): TryCatchChain<U, E> {
		const newPromise = this.promise.then(([error, data]) => {
			if (error !== undefined) {
				return [error, undefined] as Result<U, E>;
			}

			if (data === undefined) {
				return [undefined, undefined] as Result<U, E>;
			}

			try {
				const result = fn(data);
				return [undefined, result] as Result<U, E>;
			} catch (newError: unknown) {
				return [newError as E, undefined] as Result<U, E>;
			}
		}) as Promise<Result<U, E>>;

		return new TryCatchChain(newPromise);
	}

	/**
	 * Makes the chain directly awaitable by implementing PromiseLike
	 */

	// biome-ignore lint/suspicious/noThenProperty: <explanation>
	then<TResult1 = Result<T, E>, TResult2 = never>(
		onfulfilled?:
			| ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>)
			| undefined
			| null,
		onrejected?:
			| ((reason: any) => TResult2 | PromiseLike<TResult2>)
			| undefined
			| null,
	): PromiseLike<TResult1 | TResult2> {
		return this.promise.then(onfulfilled, onrejected);
	}
}

/**
 * Executes a function and returns a tuple with the result and the error
 * Can be used directly for simple cases or chained for complex cases
 * @param fn Function to execute
 * @returns Promise that resolves to either Result tuple (simple) or TryCatchChain (when chained)
 *
 * @example Simple usage:
 * const [error, result] = await tryCatch(fetch("https://example.com"));
 *
 * @example Chained usage:
 * const [error, data] = await tryCatch(fetch("https://example.com"))
 *   .andThen(response => response.json());
 */
export function tryCatch<T, E = Error>(fn: Promise<T>): TryCatchResult<T, E> {
	const promise = tryCatchFn<T, E>(fn);

	// Create a hybrid object that can be awaited directly OR chained
	const chain = new TryCatchChain(promise);

	// Make it directly awaitable for simple cases
	const result = promise as Promise<Result<T, E>> & {
		andThen: typeof chain.andThen;
		map: typeof chain.map;
	};

	// Add chaining methods
	result.andThen = chain.andThen.bind(chain);
	result.map = chain.map.bind(chain);

	return result as TryCatchResult<T, E>;
}

// Type that represents the return value - can be awaited as Result or chained
type TryCatchResult<T, E = Error> = Promise<Result<T, E>> & {
	andThen<U>(fn: (data: T) => Promise<U>): TryCatchChain<U, E>;
	map<U>(fn: (data: T) => U): TryCatchChain<U, E>;
};

/**
 * Internal function that executes a promise and returns a Result tuple
 */
const tryCatchFn = async <T, E = Error>(
	fn: Promise<T>,
): Promise<Result<T, E>> => {
	try {
		const result = await fn;
		return [undefined, result];
	} catch (error: unknown) {
		return [error as E, undefined];
	}
};
