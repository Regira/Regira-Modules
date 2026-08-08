<template>
    <section class="selector-search">
        <div class="row mt-2">
            <div class="col col-md-auto order-1">
                <!-- Filter -->
                <Filter v-model="searchObject" :result-count="itemsCount" @filter="searchHandler(true)" @change="searchHandler(true)">
                    <template #inline="{ handleToggle }">
                        <slot
                            name="inline"
                            :result-count="itemsCount"
                            :search="searchHandler"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-toggle="handleToggle"
                        >
                            <FilterInline
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="searchHandler(true)"
                                @change="searchHandler(true)"
                                @toggle-adv="handleToggle"
                            />
                        </slot>
                    </template>
                    <template #adv="{ handleClose }">
                        <slot
                            name="filterAdv"
                            :result-count="itemsCount"
                            :search="searchHandler"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-close="handleClose"
                        >
                            <component
                                :is="FilterAdv"
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="searchHandler(true)"
                                @change="searchHandler(true)"
                                @close="handleClose"
                            />
                        </slot>
                    </template>
                </Filter>
            </div>
            <div class="col-12 col-md order-3 order-md-2">
                <div class="overflow-hidden">
                    <Feedback v-bind="{ feedback }" :hideCloseButton="true" />
                    <div v-show="!feedback.status" class="row g-0">
                        <div class="col-auto">
                            <div v-if="selected?.id" class="form-control bg-info py-0">
                                <IconButton icon="selected" class="px-1 me-1" @click="handleSelect(undefined)" />
                                <FormModalButton v-model="selected" class="px-1" />
                                {{ selected.$title }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-auto order-2 mb-2">
                <FormModalButton :item-defaults="itemDefaults" :close-on-save="true" @save="({ saved }) => handleSelect(saved)" class="btn btn-info">
                    <Icon name="new" />
                    <span class="d-none d-sm-inline">{{ $t("new") }}</span>
                </FormModalButton>
            </div>
        </div>

        <!-- Paging - ResultSummary -->
        <div class="row">
            <div class="col order-2">
                <template v-if="pagingInfo != null">
                    <Paging
                        class="mt-2"
                        v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                        v-model="pagingInfo"
                        :button-type="ButtonType.button"
                        :count="itemsCount || 0"
                        @change="searchHandler(false)"
                    />
                </template>
            </div>
            <div class="col-12 col-sm-auto order-1 order-sm-3">
                <ResultSummary v-if="items?.length" :visibleCount="items.length" :totalCount="itemsCount" />
            </div>
        </div>

        <!-- List - Loading -->
        <LoadingContainer :is-loading="isLoading">
            <slot name="list" :items="items" :search-object="searchObject" :paging-info="pagingInfo">
                <component :is="List" v-model="items" :selected="selected" @select="handleSelect" />
            </slot>
        </LoadingContainer>

        <!-- Paging -->
        <template v-if="pagingInfo != null">
            <Paging
                class="mt-2"
                v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                v-model="pagingInfo"
                :button-type="ButtonType.button"
                :count="itemsCount || 0"
                @change="searchHandler(false)"
            />
        </template>

        <Debug :modelValue="{ items }" />
    </section>
</template>

<script setup lang="ts">
import { onMounted, type Ref } from "vue"
import { useSearchView } from "@regira/modules/vue/entities"
import { Icon, IconButton, Paging, LoadingContainer, Feedback, ButtonType, ResultSummary } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SearchObject from "../filter/SearchObject"
import FormModalButton from "../details/FormModalButton.vue"
import FilterInline from "../filter/FilterInline.vue"
import FilterAdv from "../filter/FilterAdv.vue"
import Filter from "../filter/Filter.vue"
import List from "./SelectorList.vue"

const props = defineProps<{
    filterDefaults?: Record<string, any>
    itemDefaults?: Ref<Record<string, any>> | Record<string, any>
    pageSize?: number
}>()

const selected = defineModel<Entity>()

const { service } = useEntityStore()

const {
    searchObject,
    pagingInfo,

    items,
    itemsCount,

    isLoading,
    feedback,

    searchHandler,
} = useSearchView<Entity, SearchObject>({
    service,
    searchObject: Object.assign(new SearchObject(), props.filterDefaults || {}),
    defaultPageSize: props.pageSize || config.defaultPageSize,
})

console.debug("SelectorSearch", {
    searchObject,
    pagingInfo,
    items,
    itemsCount,
})

function handleSelect(item?: Entity) {
    feedback.success(item != null ? `${item.$title} selected` : `selection removed`)
    selected.value = item
}

onMounted(searchHandler)
</script>
