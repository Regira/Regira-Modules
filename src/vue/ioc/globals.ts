export type GlobalOptions = {
    /** When true, plugins re-register their components app-wide via app.component(). */
    registerComponentsGlobally: boolean
}

export const globalOptions: GlobalOptions = {
    registerComponentsGlobally: false,
}

export function configureGlobals(options: Partial<GlobalOptions>): void {
    Object.assign(globalOptions, options)
}
