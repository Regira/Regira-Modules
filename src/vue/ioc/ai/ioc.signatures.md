# Regira IoC — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/ioc`. Do not guess — look up here first.

```ts
import {
    ServiceProvider,
    get,
    plugin as servicesPlugin,
    globalOptions,
    configureGlobals,
    type IServiceProvider,
    type GlobalOptions,
} from "regira/vue/ioc"
// default export = the shared ServiceProvider singleton
```

## Container

```ts
export interface IServiceProvider {
    get<T = any>(key: any): T | undefined
    add<T = any>(key: any, factory: (sp: IServiceProvider) => T): IServiceProvider
}

export class ServiceProvider implements IServiceProvider {
    services: Map<any, (sp: IServiceProvider) => any>
    constructor()
    get<T = any>(key: any): T | undefined // returns factory(this) or undefined
    add<T = any>(key: any, factory: (sp: IServiceProvider) => T): IServiceProvider // chainable
}

// resolves from the default singleton
export function get<T>(key: any): T | undefined

// default export
declare const defaultServiceProvider: IServiceProvider
export default defaultServiceProvider
```

## Vue plugin

```ts
export const plugin: {
    install(app: App<Element>, { configure }?: { configure?(services: IServiceProvider): IServiceProvider }): void
}
// install sets app.config.globalProperties.$services and provide("services", …), initializes
// app.config.globalProperties.$configs ??= {} (entity setup.ts files write $configs[Entity.name]), then runs configure(sp)
```

`$services` is augmented onto `ComponentCustomProperties` (available as `this.$services`).

## Global options

```ts
export type GlobalOptions = {
    /** When true, plugins re-register their components app-wide via app.component(). */
    registerComponentsGlobally: boolean
}

// shared, mutable module-level object; default { registerComponentsGlobally: false }
export const globalOptions: GlobalOptions

// merges the partial into globalOptions; call once before app.use(...)
export function configureGlobals(options: Partial<GlobalOptions>): void
```

Read by the component plugins at install time (`iconPlugin`, `loadingPlugin`, `pagingPlugin`,
`modalPlugin`, `debugPlugin`). Being a plain module-level object, the flag applies regardless of
`app.use` order.

## See also

- [ioc.instructions.md](ioc.instructions.md)
