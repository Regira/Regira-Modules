<template>
    <ul class="rg-lang-selector list-inline d-inline mb-0">
        <li v-for="code in langs" :key="code" class="list-inline-item">
            <button
                type="button"
                class="btn btn-link p-0 text-reset text-decoration-none"
                :class="{ 'fw-bold': langCode == code }"
                :aria-pressed="langCode == code"
                @click="handleSelect(code)"
            >
                {{ code.toUpperCase() }}
            </button>
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
