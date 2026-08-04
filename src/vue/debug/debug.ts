import type { AllowedComponentProps, VNodeProps } from "vue"

export type DebugProps = {
    title?: string
    /** any value; rendered as pretty-printed JSON when debug mode is on */
    modelValue?: unknown
}

/** any component implementing the debug-display contract (props checked at the registration site) */
export type DebugComponent = new (...args: any[]) => {
    $props: DebugProps & AllowedComponentProps & VNodeProps
}
