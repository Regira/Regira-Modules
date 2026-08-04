# Regira JsLib Debug — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/debug`. Do not guess — look up here first.

```ts
import plugin, { Debug } from "regira/vue/debug"
```

## Module exports

```ts
export { default as Debug } from "./Display.vue"
export { type DebugProps, type DebugComponent } from "./debug"
export { default, default as plugin } from "./plugin"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $isDebug: boolean
        $setDebug: (value?: boolean) => boolean
    }
}
```

## Plugin

```ts
type IOptions = {
    isDebug: boolean
    /** the component registered app-wide as `Debug` when registerComponentsGlobally is on (compile-checked) */
    Debug?: DebugComponent
}
declare const _default: {
    install(app: App<Element>, options?: IOptions): void
}
export default _default
```

## Debug component

```ts
export type DebugProps = {
    title?: string
    /** any value; rendered as pretty-printed JSON when debug mode is on */
    modelValue?: unknown
}
export type DebugComponent // any component implementing DebugProps — the plugin's Debug option type
declare const _default: DefineComponent<DebugProps /* … */>
export default _default
```

## See also

- [debug.instructions.md](debug.instructions.md)
