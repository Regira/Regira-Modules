/// <reference lib="es2017.object" />

import type { AllowedComponentProps, VNodeProps } from "vue"
import bsIcons from "./bootstrap-icons"

export type IconsConfig = { source: string; icons: Map<string, string> }

type IconSet = Record<string, string> | Array<Array<string>>

export type IconSize = "sm" | "md" | "lg" | "xl"
export type IconProps = { name: string; size?: IconSize }
export const iconDefaults = {
    size: "md" as IconSize,
}

export type IconButtonProps = {
    icon: string
    size?: IconSize
    type?: "button" | "submit" | "reset"
}
export const iconButtonDefaults = {
    type: "button" as const,
}
export type IconButtonSlots = {
    default?(): any
}

/** any component implementing the icon contract (props checked at the registration site) */
export type IconComponent = new (...args: any[]) => {
    $props: IconProps & AllowedComponentProps & VNodeProps
}
export type IconButtonComponent = new (...args: any[]) => {
    $props: IconButtonProps & AllowedComponentProps & VNodeProps
}

export const iconMap = new Map<string, string>()

export function load(icons: IconSet) {
    const entries = Array.isArray(icons) ? icons : Object.entries(icons)
    entries.forEach(([key, icon]) => {
        iconMap.set(key!, icon!)
    })
}
export function clear() {
    iconMap.clear()
}

// seed the Bootstrap set so friendly keys resolve without iconPlugin; the plugin re-seeds (bs or fa) on install
load(bsIcons)

export default iconMap
