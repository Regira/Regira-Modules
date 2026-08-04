<template>
    <a class="rg-anchor" :href="url"><slot></slot></a>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { isEmail, isIP, isPhone } from "../../../utilities/string-utility"
import type { AnchorProps, AnchorSlots } from "./inputs"

const props = defineProps<AnchorProps>()
defineSlots<AnchorSlots>()

const url = computed(() => {
    let input = props.href
    if (isEmail(input)) {
        if (!input.startsWith("mailto:")) {
            input = "mailto:" + input
        }
    } else if (isIP(input)) {
        input = "http://" + input
    } else if (isPhone(input)) {
        if (!input.startsWith("tel:")) {
            input = "tel:" + input
        }
    } else if (!input.startsWith("http") && !["mailto:", "tel:", "ftp:"].some((prefix) => input.startsWith(prefix))) {
        input = "http://" + input
    }
    return input
})
</script>
