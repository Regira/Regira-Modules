export const naturalCompare = <T>(as: T, bs: T, f: (x: T) => string | number) => {
    // https://stackoverflow.com/questions/4373018/sort-array-of-numeric-alphabetical-elements-natural-sort#answer-4373037
    let a1: string,
        b1: string,
        i = 0
    const rx = /(\d+)|(\D+)/g,
        rd = /\d/
    if (isFinite(Number(f(as))) && isFinite(Number(f(bs)))) {
        return Number(f(as)) - Number(f(bs))
    }
    const a = String(f(as)).toLowerCase()
    const b = String(f(bs)).toLowerCase()
    if (a === b) {
        return 0
    }
    if (!(rd.test(a) && rd.test(b))) {
        return a > b ? 1 : -1
    }
    const aMatches = a.match(rx) ?? []
    const bMatches = b.match(rx) ?? []
    const length = aMatches.length > bMatches.length ? bMatches.length : aMatches.length
    while (i < length) {
        a1 = aMatches[i]!
        b1 = bMatches[i++]!
        if (a1 !== b1) {
            if (isFinite(Number(a1)) && isFinite(Number(b1))) {
                const na = a1.charAt(0) === "0" ? Number("." + a1) : Number(a1)
                const nb = b1.charAt(0) === "0" ? Number("." + b1) : Number(b1)
                return na - nb
            } else {
                return a1 > b1 ? 1 : -1
            }
        }
    }
    return aMatches.length - bMatches.length
}
export const getRandom = (min = 0, max = min) => {
    if (max === min) {
        min = 0
    }
    if (max <= min) {
        if (min === 0) {
            return 0
        }
        const errorMessage = "Invalid input (max should be greater than min)"
        console.error(errorMessage, { min, max })
        throw Error(errorMessage)
    }
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// utility
export default {
    naturalCompare,
    getRandom,
}
