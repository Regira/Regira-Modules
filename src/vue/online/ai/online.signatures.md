# Regira JsLib Online — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/online`. Do not guess — look up here first.

```ts
import { useOnlineChecker, plugin } from "regira/vue/online"
import onlinePlugin from "regira/vue/online" // default export === plugin
```

## Composable

```ts
export type IsOnline = {
    isOnline: Ref<boolean>
}
export declare function useOnlineChecker(): IsOnline
export default useOnlineChecker // this module's own default; the package root's default is the plugin (below)
```

## Plugin

```ts
declare const _default: {
    install(app: App<Element>): void
}
export default _default
// re-exported from index as both `plugin` and the package default
export { default as plugin, default } from "./plugin"
```

## Global property augmentation

```ts
declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $isOnline: import("vue").Ref<boolean>
    }
}
```

## See also

- [online.instructions.md](online.instructions.md)
