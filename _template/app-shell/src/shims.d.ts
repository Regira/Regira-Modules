declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $isAdmin: boolean // provided by infrastructure/user-plugin.ts (auth-only)
    }
}
export {}
