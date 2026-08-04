import { isArray, toArray, take, average, min, max } from "./array-utility"
import { startsWith, trim } from "./string-utility"

export const rgbToHex = (r: number, g: number, b: number): string => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")

export const hexToRgb = (hex: string, opacity?: number) => {
    if (hex.length === 4) {
        // e.g. #FFF
        hex = "#" + toArray(trim(hex, "#").toLowerCase()).reduce((r, x) => r + x + x, "")
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
              a: opacity != undefined ? opacity : 1,
          }
        : undefined
}
export const hexToRgbString = (hex: string, opacity?: number): string | undefined => {
    const rgba = hexToRgb(hex, opacity)
    return rgba ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})` : undefined
}
export const hexToRgbArray = (hex: string, opacity?: number): number[] => {
    const rgb = hexToRgb(hex, opacity)
    if (!rgb) return [0, 0, 0, 1]
    const { r, g, b, a = 1 } = rgb
    return [r, g, b, a]
}
export const getRgbString = (input: number[] | string, opacity?: number): string | undefined => {
    if (isArray(input)) {
        const [r, g, b, a = 1] = input
        return `rgba(${r},${g},${b},${a})`
    }
    if (typeof input === "string") {
        if (startsWith(input, "#")) {
            return hexToRgbString(input, opacity)
        }
        if (startsWith(input, "rgba")) {
            return input
        }
        if (startsWith(input, "rgb")) {
            const segments = trim(input.substring("rgb".length), "()").split(",").map(Number)
            return getRgbString(segments, opacity)
        }
    }
    return undefined
}
export const invertRgb = (r: number, g: number, b: number) => {
    const [ri, gi, bi] = [r, g, b].map((x) => 255 - x)
    return { ri, gi, bi }
}
export const invertHex = (hex: string): string => {
    const [r, g, b] = hexToRgbArray(hex)
    const { ri, gi, bi } = invertRgb(r, g, b)
    return rgbToHex(ri, gi, bi)
}
export const grayscale = (hex: string, type = "average"): string => {
    const rgb = take(hexToRgbArray(hex), 3) //skip opacity
    let gray: [number, number, number]
    switch (type) {
        case "light": {
            const maxValue = Math.round((max(rgb) as number) * 0.8)
            gray = [maxValue, maxValue, maxValue]
            break
        }
        case "dark": {
            const minValue = min(rgb) as number
            gray = [minValue, minValue, minValue]
            break
        }
        case "weight": {
            const factors = [0.21, 0.72, 0.07]
            const weighted = Math.round(rgb.reduce((acc, x, i) => acc + x * factors[i], 0))
            gray = [weighted, weighted, weighted]
            break
        }
        default: {
            //'average'
            const avg = Math.round(average(rgb))
            gray = [avg, avg, avg]
            break
        }
    }
    return rgbToHex(...gray)
}

// utility
export default {
    rgbToHex,
    hexToRgb,

    hexToRgbString,
    hexToRgbArray,
    getRgbString,

    invertRgb,
    invertHex,

    grayscale,
}
