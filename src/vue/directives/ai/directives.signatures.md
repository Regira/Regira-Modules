# Regira Directives — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/directives`. Do not guess — look up here first.

```ts
import { focus, clickOutside, grow } from "regira/vue/directives"
```

## Barrel (index.d.ts)

```ts
export { default as clickOutside } from "./click-outside"
export { default as focus } from "./focus"
export { default as grow } from "./textarea-grow"
```

> Note: the barrel re-exports each file's `default` (the plugin object with `install`) under the named export — not the file's named directive-object export (`focus`/`clickOutside`/`grow`).

## focus (focus.d.ts)

```ts
import type { App } from "vue"
export declare const focus: {
    mounted: (el: HTMLElement) => void
}
declare const _default: {
    install(app: App<Element>): void
}
export default _default
```

## clickOutside (click-outside.d.ts)

```ts
import type { App } from "vue"
export declare const clickOutside: {
    beforeMount: (el: any, binding: any) => void
    unmounted: (
        el: HTMLElement & {
            clickOutsideEvent(): void
        }
    ) => void
}
declare const _default: {
    install(app: App<Element>): void
}
export default _default
```

## grow (textarea-grow.d.ts)

```ts
import type { App } from "vue"
type Options = {
    maxGrow: number
}
export declare const grow: {
    beforeMount(el: HTMLTextAreaElement): void
    unmounted: (el: HTMLTextAreaElement) => void
}
declare const _default: {
    install(app: App<Element>, options?: Options): void
}
export default _default
```

## See also

- [directives.instructions.md](directives.instructions.md)
