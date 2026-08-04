<template>
    <nav class="rg-paging" aria-label="Pagination">
        <!-- flex-wrap: the button row must break onto a second line rather than push the page sideways -->
        <ul class="pagination flex-wrap">
            <li class="rg-paging__page page-item">
                <slot name="firstPage" :page="1">
                    <component :is="PagingElement" :page="1" :to="pagedRoute(1)" @click.prevent="handleChangePage(1)" aria-label="Previous"
                        >&laquo;</component
                    >
                </slot>
            </li>
            <li class="rg-paging__page page-item" v-for="p in pages" :key="p" :class="{ active: p == page }">
                <slot name="default" :page="p" :route="pagedRoute(p)" :handleChange="handleChangePage">
                    <component :is="PagingElement" :page="p" :to="pagedRoute(p)" @click.prevent="handleChangePage(p)">{{ p }}</component>
                </slot>
            </li>
            <li class="rg-paging__page page-item">
                <slot name="lastPage" :page="totalPages">
                    <component
                        :is="PagingElement"
                        :page="totalPages"
                        :to="pagedRoute(totalPages)"
                        @click.prevent="handleChangePage(totalPages)"
                        aria-label="Next"
                    >
                        &raquo;
                    </component>
                </slot>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
import { toRefs } from "vue"
import { useVModelField } from "../../vue-helper"
import type { IPagingInfo } from "../../entities/abstractions/PagingInfo"
import usePaging, { ButtonType, type PagingProps, type PagingEmits, type PagingSlots, pagingDefaults } from "./paging"
import PagingAnchor from "./PagingAnchor.vue"
import PagingButton from "./PagingButton.vue"

const emit = defineEmits<PagingEmits>()
const props = withDefaults(defineProps<PagingProps>(), { ...pagingDefaults })
defineSlots<PagingSlots>()

const pagingInfo = useVModelField<IPagingInfo>(props, emit)
const { count } = toRefs(props)

const PagingElement = props.buttonType == ButtonType.button ? PagingButton : PagingAnchor

const { pagedRoute, page, totalPages, pages, handleChangePage } = usePaging({
    pagingInfo,
    count,
    maxPages: props.maxPages,
    emit,
})
</script>
