# Regira UI — Examples

Verify props/signatures in [ui.signatures.md](ui.signatures.md).

## Install plugins (startup)

```ts
import { iconPlugin, feedbackPlugin, loadingPlugin, pagingPlugin, screenPlugin } from "@regira/modules/vue/ui"
import "@regira/modules/style.css" // component styles (modal backdrop, autocomplete dropdown)

app.use(screenPlugin)
app.use(feedbackPlugin)
app.use(iconPlugin, { source: "bs", icons: appIcons }) // seed friendly icon keys
app.use(loadingPlugin, { img: "/loading.svg" })
app.use(pagingPlugin, { defaultPageSize: 10 })
```

Plugins only configure; components are imported where used — e.g. `import { DefaultModal, Icon } from "@regira/modules/vue/ui"`.

## Overview building blocks

```vue
<script setup lang="ts">
import { Paging, LoadingContainer, Feedback } from "@regira/modules/vue/ui"
import { useSearchView, useRouteOverview } from "@regira/modules/vue/entities"
import config from "../config/config"
const { service } = useEntityStore()
const { pagingInfo, items, itemsCount, isLoading, feedback, searchHandler } = useSearchView({
    service,
    searchObject: new SearchObject(),
    defaultPageSize: config.defaultPageSize,
})
const { updateOverviewRoute } = useRouteOverview({ searchObject, pagingInfo, handler: searchHandler, defaultPageSize: config.defaultPageSize })
</script>
<template>
    <Feedback :feedback="feedback" />
    <LoadingContainer :is-loading="isLoading">
        <!-- render items -->
    </LoadingContainer>
    <Paging v-model="pagingInfo" :count="itemsCount" @change="updateOverviewRoute()" />
</template>
```

## Tabs + responsive layout

```vue
<script setup lang="ts">
import { computed } from "vue"
import { TabContainer, Tab, useScreen } from "@regira/modules/vue/ui"
const { screen } = useScreen()
const tabs = computed(() =>
    [
        Tab.create("form", { icon: "form", title: "Form", isDefault: true }),
        !screen.isLarge ? Tab.create("more", { icon: "list", title: "More" }) : undefined,
    ]
)
</script>
<template>
    <TabContainer :tabs="tabs">
        <!-- one named slot per tab key: <template #form>…</template> -->
    </TabContainer>
</template>
```

Hash-routed tabs for a big entity form — a main `#form` tab plus related-data tabs; the hash keeps
tabs deep-linkable and back-button friendly (disable route nav inside popups):

```vue
<script setup lang="ts">
const props = defineProps<{ modelValue: Entity; isPopup?: boolean; initialTab?: string }>()
const tabs = computed(() => [
    Tab.create("form", { icon: "form", title: $t("form"), isDefault: true }),
    Tab.create("products", { icon: "products", title: $t("products") }),
])
</script>
<template>
    <TabContainer :tabs="tabs" :active="initialTab" :use-route-nav="!isPopup">
        <template #form><!-- the entity's own fields --></template>
        <template #products><ProductsOverview :parent="item" /></template>
    </TabContainer>
</template>
```

## App-wide feedback

```ts
// via the global (after feedbackPlugin)
app.config.globalProperties.$feedback.success("Saved")

// or a local instance
import { useFeedback } from "@regira/modules/vue/ui"
const feedback = useFeedback({ autoHideDelay: 3000 })
feedback.fail("Could not save", { title: "required" })
```

## Modal

```vue
<script setup lang="ts">
import { ref } from "vue"
import { DefaultModal, ModalType } from "@regira/modules/vue/ui/modal"
import "@regira/modules/vue/ui/modal/style.scss"
const isVisible = ref(false)
</script>
<template>
    <DefaultModal
        :is-visible="isVisible"
        title="Confirm"
        :type="ModalType.warning"
        @submit="onSubmit"
        @cancel="isVisible = false"
        @close="isVisible = false"
    >
        Are you sure?
    </DefaultModal>
</template>
```

## Icons

```vue
<script setup lang="ts">
import { BsIcon, IconButton } from "@regira/modules/vue/ui"
</script>
<template>
    <BsIcon name="bi bi-box-seam" size="lg" />
    <IconButton icon="bi bi-trash" @click="remove" />
</template>
```

## Autocomplete

```vue
<script setup lang="ts">
import { Autocomplete } from "@regira/modules/vue/ui"
import { get } from "@regira/modules/vue/ioc"
const service = get<IEntityService<Product>>("Product")!
</script>
<template>
    <Autocomplete
        v-model="selected"
        :search="(term) => service.list({ q: term })"
        :display-item-formatter="(p) => p?.$title ?? ''"
        @select="onSelect"
    >
        <!-- optional: custom result-item rendering (default: display string, matched term bolded) -->
        <template #default="{ item, q }">
            <strong>{{ item.code }}</strong> — {{ item.$title }}
        </template>
    </Autocomplete>
</template>
```

## Date input

```vue
<script setup lang="ts">
import { DateInput } from "@regira/modules/vue/ui"
</script>
<template>
    <DateInput v-model="item.publishedOn" culture="nl-BE" />
    <!-- show-time renders <input type="datetime-local"> and keeps the time on the emitted Date -->
    <DateInput v-model="item.startsAt" show-time />
</template>
```

## Customize the look

Full guide: [ui.customize.md](ui.customize.md). The three most-used moves:

```scss
// 1) src/assets/theme.scss (imported after bootstrap + @regira/modules/style.css) — app-wide re-theme
:root {
    --rg-accent: #7c3aed;
    --rg-accent-bg: rgba(124, 58, 237, 0.12);
}
.btn-primary {
    --bs-btn-bg: var(--rg-accent); // precompiled Bootstrap reads component-level vars, not --bs-primary
    --bs-btn-border-color: var(--rg-accent);
}
.rg-modal__header {
    border-bottom: 3px solid var(--rg-accent); // stable rg-* hooks — no ::v-deep, no !important
}
```

```ts
// 2) main.ts — swap EVERY modal in the app (incl. the ones inside library components) for a branded skin
import MyBrandedModal from "@/components/ui/MyBrandedModal.vue" // implements ModalProps/ModalEmits/ModalSlots
app.use(modalPlugin, { Modal: MyBrandedModal })
```

```bash
# 3) eject a reference skin and restyle the copy (imports stay on public regira API)
node node_modules/@regira/modules/_template/scaffold.mjs --ui list
node node_modules/@regira/modules/_template/scaffold.mjs --ui Paging
```

## See also

- [ui.instructions.md](ui.instructions.md) · [ui.signatures.md](ui.signatures.md) · [ui.customize.md](ui.customize.md)
