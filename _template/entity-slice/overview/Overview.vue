<template>
    <section class="overview">
        <div class="row justify-content-between gx-0 gx-sm-1">
            <div class="col col-lg-auto order-1">
                <!-- Filter -->
                <Filter v-model="searchObject" @filter="updateOverviewRoute(true)" @change="updateOverviewRoute(true)" :result-count="itemsCount">
                    <template #adv="{ handleClose }">
                        <slot
                            name="filterAdv"
                            :result-count="itemsCount"
                            :search="updateOverviewRoute"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-close="handleClose"
                        >
                            <component
                                :is="FilterAdv"
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="updateOverviewRoute(true)"
                                @change="updateOverviewRoute(true)"
                                @close="handleClose"
                            />
                        </slot>
                    </template>
                </Filter>
            </div>
            <div class="col-12 col-lg order-3 order-lg-2">
                <Feedback v-bind="{ feedback }" :hideCloseButton="true" />
            </div>
            <div class="col-auto order-2 order-lg-3 ps-2">
                <template v-if="config.isComplex">
                    <RouterLink :to="{ name: config.key + 'Details', params: { id: 'new' } }" class="btn btn-info">
                        <Icon name="new" /><span class="d-none d-sm-inline ms-1">{{ $t("new") }}</span>
                    </RouterLink>
                </template>
                <template v-else>
                    <FormModalButton class="btn btn-info" @save="searchHandler(false)">
                        <Icon name="new" /><span class="d-none d-sm-inline ms-1">{{ $t("new") }}</span>
                    </FormModalButton>
                </template>
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
                        :count="itemsCount || 0"
                        @change="updateOverviewRoute(false)"
                    />
                </template>
            </div>
            <div class="col-12 col-sm-auto order-1 order-sm-3">
                <ResultSummary v-if="items?.length" :visibleCount="items.length" :totalCount="itemsCount" />
            </div>
        </div>

        <!-- List - Loading -->
        <LoadingContainer :is-loading="isLoading">
            <component
                :is="List"
                v-if="items && items.length > 0"
                v-model="items"
                @request-save="handleRequestSave"
                @request-remove="handleRequestRemove"
                @save="handleSave"
                @remove="handleRemove"
                @request-reload="updateOverviewRoute(false)"
            />
            <p v-if="items && items.length <= 0" class="italic-muted">
                {{ $t("noResults") }}
            </p>
        </LoadingContainer>

        <!-- Paging -->
        <template v-if="pagingInfo != null">
            <Paging
                class="mt-2"
                v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                v-model="pagingInfo"
                :count="itemsCount || 0"
                @change="updateOverviewRoute(false)"
            />
        </template>

        <Debug
            :modelValue="{
                pagingInfo,
                items,
            }"
        />
    </section>
</template>

<script setup lang="ts">
import { useSearchView, useRouteOverview, type OverviewEmits } from "regira/vue/entities"
import { Icon, Paging, LoadingContainer, Feedback, ResultSummary } from "regira/vue/ui"
import { Debug } from "regira/vue/debug"
import { useAuthStore } from "regira/vue/auth"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SearchObject from "../filter/SearchObject"
import Filter from "../filter/Filter.vue"
import FilterAdv from "../filter/FilterAdv.vue"
import List from "./List.vue"
import FormModalButton from "../details/FormModalButton.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
defineEmits<Emits>()

const { service } = useEntityStore()

const { searchObject, pagingInfo, items, itemsCount, isLoading, feedback, applySave, applyRemove, handleSave, handleRemove, searchHandler } =
    useSearchView<Entity, SearchObject>({
        service,
        searchObject: new SearchObject(),
        defaultPageSize: config.defaultPageSize,
    })
const { updateOverviewRoute } = useRouteOverview({
    searchObject,
    pagingInfo,
    handler: searchHandler,
    defaultPageSize: config.defaultPageSize,
})

// trigger searchHandler when logging in or refreshing token — no-auth app: delete these two lines (scaffold.mjs --no-auth strips them; see entities.setup.md#running-without-authentication)
const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => ["login", "refresh"].includes(name) && after(() => authStore.isAuthenticated && searchHandler(false)))

async function handleRequestSave(item: Entity) {
    const result = await applySave(item)
    if (result != null) {
        handleSave(result)
    }
}
async function handleRequestRemove(item: Entity) {
    // Guard on the result, exactly like save: a delete the server refused (409 while the row is still
    // referenced) would otherwise show the failure AND remove the row until the next fetch.
    if (await applyRemove(item)) {
        handleRemove(item)
    }
}
</script>
