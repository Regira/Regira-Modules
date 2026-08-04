# Regira App — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/app`. Do not guess — look up here first.

```ts
import { plugin, useAppStore, AppStatus, useCulture, onAppReady, whenAppReady } from "regira/vue/app"
```

## Plugin

```ts
export declare const plugin: {
    install(
        app: App,
        {
            culture,
        }?: {
            culture?: string
        }
    ): void
}
export default plugin
```

## Store

```ts
export declare enum AppStatus {
    Init = "Init",
    Loading = "Loading",
    Mounting = "Mounting",
    Ready = "Ready",
}

// Pinia store "AppStore" — state: status, culture, logo; getter: isReady;
// actions: setCulture(value?), setStatus(value), setLogo(value)
export declare const useAppStore: import("pinia").StoreDefinition<
    "AppStore",
    Pick<
        {
            culture: import("vue").Ref<string, string>
            logo: import("vue").Ref<string | undefined, string | undefined>
            status: import("vue").Ref<AppStatus, AppStatus>
            isReady: import("vue").ComputedRef<boolean>
            setCulture(value?: string): void
            setStatus(value: AppStatus): void
            setLogo(value: string): void
        },
        "status" | "culture" | "logo"
    >,
    Pick<{/* …same shape… */}, "isReady">,
    Pick<{/* …same shape… */}, "setCulture" | "setStatus" | "setLogo">
>
export default useAppStore
```

## Culture

```ts
export declare function useCulture(): string | undefined
export default useCulture
```

## Ready hooks

```ts
export declare function onAppReady(func: Function): void
export declare function whenAppReady(): Promise<void>
```

## Global properties

Declared on Vue's `ComponentCustomProperties` (available in templates and `this`):

```ts
$culture: string;
$setCulture: (value: string) => void;
$isReady: boolean;
$appStatus: AppStatus;
$setAppStatus: (value: AppStatus) => void;
```

## See also

- [app.instructions.md](app.instructions.md)
