<template>
    <div class="entity-overview">
        <slot name="toolbar" :reload="reload" :set-page="setPage" />
        <table class="table">
            <thead>
                <slot name="head" />
            </thead>
            <tbody>
                <tr v-for="item in items" :key="item.$id">
                    <slot name="row" :item="item" :remove="remove" :reload="reload">
                        <td>{{ item.$title }}</td>
                    </slot>
                </tr>
            </tbody>
        </table>

        <div class="entity-paging d-flex align-items-center gap-2">
            <slot name="paging" :page="page" :page-count="pageCount" :count="count" :set-page="setPage">
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="page <= 1" @click="setPage(page - 1)">Previous</button>
                <span class="text-muted small">Page {{ page }} / {{ pageCount }} · {{ count }}</span>
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="page >= pageCount" @click="setPage(page + 1)">Next</button>
            </slot>
        </div>
    </div>
</template>

<script setup lang="ts" generic="T extends IEntity">
import type { IEntity } from "../abstractions"
import { useLeanOverview, leanOverviewDefaults, type LeanOverviewProps, type LeanOverviewSlots } from "./overview"

const props = withDefaults(defineProps<LeanOverviewProps<T>>(), { ...leanOverviewDefaults })
defineSlots<LeanOverviewSlots<T>>()

const { items, count, page, pageCount, reload, setPage, remove } = useLeanOverview<T>(props)

defineExpose({ reload, setPage })
</script>
