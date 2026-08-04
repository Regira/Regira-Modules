import { ref, type Ref } from "vue"

export interface IScreenSize extends Array<number> {}
export interface IScreen {
    get size(): number[]
    get isExtraSmall(): boolean
    get isSmall(): boolean
    get isMedium(): boolean
    get isLarge(): boolean
    get isExtraLarge(): boolean
    get isExtraExtraLarge(): boolean
    get layout(): string
    updateSize(newSize: IScreenSize): void
    isSize(size: string): boolean
}
type ScreenOut = {
    size: Ref<number[]>
    screen: IScreen
}
/**
 * The viewport as [width, height]. Guarded, so the module works outside a DOM (SSR, a Node script importing
 * the UI barrel) instead of throwing on `window`: without one it reports [0, 0], the smallest breakpoint —
 * the same mobile-first assumption the CSS starts from. The real size lands on the client, where the first
 * `useScreen()` reads it and the resize listener keeps it current.
 */
export function getWindowSize(): IScreenSize {
    return typeof window === "undefined" ? [0, 0] : [window.innerWidth, window.innerHeight]
}

export const SCREEN_SIZES = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
} as Record<string, number>

function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number): (...args: A) => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    return (...args: A) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), wait)
    }
}

// The window size is global state, so every consumer (the screen plugin, usePaging, an app component) shares
// ONE reactive instance — a per-call ref would only ever update for whoever owns the resize listener, and the
// rest would keep reporting the size the page happened to load at. Created (and subscribed) lazily, so
// importing this module stays side-effect free; both the size it starts at and the subscription are guarded,
// so CALLING useScreen() where there is no window is safe too (it reports getWindowSize()'s [0, 0] fallback).
let instance: ScreenOut | undefined

export function useScreen(): ScreenOut {
    if (instance) {
        return instance
    }
    const size: Ref<IScreenSize> = ref(getWindowSize())
    const screen: IScreen = {
        get size() {
            return size.value
        },
        get isExtraSmall() {
            return this.size[0]! >= SCREEN_SIZES.xs!
        },
        get isSmall() {
            return this.size[0]! >= SCREEN_SIZES.sm!
        },
        get isMedium() {
            return this.size[0]! >= SCREEN_SIZES.md!
        },
        get isLarge() {
            return this.size[0]! >= SCREEN_SIZES.lg!
        },
        get isExtraLarge() {
            return this.size[0]! >= SCREEN_SIZES.xl!
        },
        get isExtraExtraLarge() {
            return this.size[0]! >= SCREEN_SIZES.xxl!
        },
        get layout() {
            return this.isExtraExtraLarge ? "xxl" : this.isExtraLarge ? "xl" : this.isLarge ? "lg" : this.isMedium ? "md" : this.isSmall ? "sm" : "xs"
        },
        isSize(sizeToCheck: string) {
            return this.size[0]! >= SCREEN_SIZES[sizeToCheck]!
        },
        updateSize: (newSize = getWindowSize()) => (size.value = newSize),
    }

    instance = { size, screen }

    if (typeof window !== "undefined") {
        const updateSize = debounce(() => screen.updateSize(getWindowSize()), 250)
        window.addEventListener("resize", updateSize)
        window.addEventListener("orientationchange", updateSize)
    }

    return instance
}

export default useScreen
