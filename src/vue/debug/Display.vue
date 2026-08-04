<template>
    <div v-if="isDebug" class="debug" :class="{ minimized: isMinimized }">
        <button type="button" class="btn btn-default" @click.stop="isMinimized = !isMinimized">
            <Icon :name="isMinimized ? 'maximize' : 'minimize'" />
        </button>
        <div class="title" @click="isMinimized = !isMinimized">Debug {{ title }}</div>
        <div class="value">
            {{ value }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, getCurrentInstance } from "vue"
import Icon from "../ui/icons/Icon.vue"
import type { DebugProps } from "./debug"

const props = defineProps<DebugProps>()

const isMinimized = ref(false)
const instance = getCurrentInstance()
const isDebug = computed(() => (instance?.proxy as { $isDebug?: boolean })?.$isDebug)
const value = computed(() => JSON.stringify(props.modelValue ?? {}, null, 2))
</script>

<style scoped lang="scss">
.debug {
    opacity: 0.6;
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 1rem;
    background-color: rgba(200, 200, 200, 0.25);
    position: relative;

    button {
        float: right;
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
    }

    .title {
        font-weight: bold;
        padding-bottom: 0.5rem;
        margin-bottom: 0.5rem;
        border-bottom: 2px solid rgba(200, 200, 200, 0.5);
        cursor: pointer;
    }

    .value {
        font-style: italic;
        white-space: pre-wrap;
        opacity: 0.6;
    }

    &.minimized {
        // display: inline-block;

        .title {
            border-bottom: none;
            padding-bottom: 0;
            margin-bottom: 0;
        }
        .value {
            display: none;
        }
    }
}
</style>
