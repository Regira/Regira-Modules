/**
 * Debounces a function and returns a promise when invoked, all promises resolve to the final (invoked) value
 *
 * @param {Function} func
 *  The function to debounce
 * @param {number} wait
 *  Maximum delay in Milliseconds before invoking
 *
 * @returns {Promise} Returns the result of the invoked function, wrapped in a Promise
 */
export const debounceToPromise = <T>(func: (...args: unknown[]) => T, wait = 250) => {
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined
    let funcsToResolve: Array<(value: T) => void> = []
    return async function (...args: unknown[]) {
        // https://davidwalsh.name/javascript-debounce-function
        if (timeout !== undefined) clearTimeout(timeout)
        return new Promise<T>((resolve) => {
            funcsToResolve.push(resolve)
            timeout = setTimeout(() => {
                timeout = undefined
                const result = func(...args)
                while (funcsToResolve.length) {
                    funcsToResolve.shift()!(result)
                }
            }, wait)
        })
    }
}
/**
 * Executes a collection of (async) functions in order.
 * By default every function runs even if earlier ones reject, and the returned promise
 * rejects with the array of all errors. Pass `throwOnFirstError` to stop at the first
 * rejection and reject with that single error instead.
 * @param arr array of (async) functions
 * @param throwOnFirstError stop and reject on the first error (default false)
 */
export const enqueue = async (arr: Array<() => unknown>, throwOnFirstError = false): Promise<unknown[]> => {
    const results: unknown[] = []
    const errors: unknown[] = []
    for (const task of arr) {
        try {
            results.push(await task())
        } catch (err) {
            if (throwOnFirstError) {
                throw err
            }
            errors.push(err)
        }
    }
    if (errors.length) {
        return Promise.reject(errors)
    }
    return results
}

export const delay = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms))

// utility object
export default {
    debounceToPromise,
    enqueue,
    delay,
}
