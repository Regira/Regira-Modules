<template>
    <ul class="rg-lang-selector list-inline d-inline mb-0">
        <li
            v-for="code in langs"
            :key="code"
            class="list-inline-item"
            :class="{ 'fw-bold': langCode == code }"
            role="button"
            @click="handleSelect(code)"
        >
            {{ code.toUpperCase() }}
        </li>
    </ul>
</template>

<script setup lang="ts">
import { useLang } from "./useLang"
import type { LangSelectorProps, LangSelectorEmits } from "./langSelector"

defineProps<LangSelectorProps>()
const emit = defineEmits<LangSelectorEmits>()

const { langCode, setLangCode } = useLang()

function handleSelect(code: string) {
    setLangCode(code)
    emit("select", code)
}
</script>
