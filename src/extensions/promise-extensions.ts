import { debounceToPromise, enqueue } from "../utilities/promise-utility"

declare global {
    interface PromiseConstructor {
        debounce: typeof debounceToPromise
        enqueue: typeof enqueue
    }
}

export default {
    use() {
        Promise.debounce = debounceToPromise
        Promise.enqueue = enqueue
    },
}
