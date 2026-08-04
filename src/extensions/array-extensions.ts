import arrayUtility from "../utilities/array-utility"

const { isArray, isIterable, toArray, newArray, ...arrayFunctions } = arrayUtility

export default {
    injectInto(target: object, overwrite = false) {
        const fns = arrayFunctions as Record<string, (...args: unknown[]) => unknown>
        Object.getOwnPropertyNames(fns).forEach((prop) => {
            if (prop !== "constructor" && (overwrite || !Object.prototype.hasOwnProperty.call(target, prop))) {
                Object.defineProperty(target, prop, {
                    value: function () {
                        const args = [this, ...arguments]
                        return fns[prop].apply(this, args)
                    },
                    configurable: true,
                })
            }
        })
    },
    use(overwrite = false) {
        this.injectInto(Array.prototype, overwrite)
    },
}
