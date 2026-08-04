# Regira JsLib Entities — Domain Blueprints (SPA)

Front-end counterparts of the back-end domain blueprints (`get_package("Regira.Entities", section: "blueprints")`). Ready-to-copy feature slices proven in the Regira reference apps — copy into your app and adapt names; everything builds on the standard module surface (`EntityBase`, `EntityServiceBase`, `useOwnedCollection`, `useTree`, the auth store).

| Blueprint                                                                  | Use when                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Labels editor](#labels-editor-entitylabels)                               | Editing free-form label/tag rows inside an owner's form (back-end EntityLabels)  |
| [Tenant switcher](#tenant-switcher-multi-tenancy)                          | Letting a user switch the active tenant of a multi-tenant API                    |
| [Family tree view](#family-tree-view-recursive-entities)                   | Rendering/navigating an entity's ancestors + descendants from the tree endpoints |
| [Polymorphic entity](#polymorphic-entity-single-class-over-a-tph-back-end) | One SPA slice over a TPH back-end (e.g. Person/Organization parties)             |

---

## Labels editor (EntityLabels)

Client side of the back-end **EntityLabels** blueprint: labels are an _owned_ collection on the owner entity — edited inline in the owner's form, persisted with the owner's save, deleted by omission. No label store, service, or route of its own.

### Entity + client-side type detection

```ts
// entities/entity-labels/Entity.ts
import { EntityBase } from "regira/vue/entities"

export class EntityLabel extends EntityBase {
    id: number = 0
    objectId?: number
    title?: string
    value!: string
    labelType?: string
    created!: Date
    lastModified?: Date
    _deleted?: boolean // transient UI mark — stripped before save

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.value
    }

    static create(values?: object): EntityLabel {
        return Object.assign(new EntityLabel(), values || {})
    }
}
```

`labelType` is a **display hint decided on the client** from the value's shape (the back-end only stores it) — recompute it on every value edit:

```ts
export enum LabelTypes {
    Default = "Default",
    Date = "Date",
    Phone = "Phone",
    Email = "Email",
    Url = "Url",
}

export function getLabelType(value: string) {
    if (isEmail(value)) return LabelTypes.Email
    if (isDate(value)) return LabelTypes.Date
    if (isPhone(value)) return LabelTypes.Phone
    if (isUrl(value)) return LabelTypes.Url
    return LabelTypes.Default
}
// on input:  item.value.labelType = getLabelType(item.value.value).toString()
```

### Component set

One folder, five small components — reusable across every labelled owner:

- **`Overview.vue`** — the editor: a `FormSection`, a `vuedraggable` list of `InlineInput` rows (drag handle drives `sortOrder`), plus one empty `InlineInput` that appends a row on first input. Optional `showSummary` renders `Summary`.
- **`InlineInput.vue`** — one row: title input + `LabelIcon` + value input + add/remove button. Remove is a **soft delete**: toggle `item.value._deleted` (row stays visible, struck through).
- **`ListItem.vue`** — read-only display; renders url/email/phone values as anchors.
- **`Summary.vue`** — labels grouped by `title` into chips (`groupBy`).
- **`LabelIcon.vue`** — `LabelTypes → icon` map.

### Owner integration

```html
<!-- owner details/Form.vue — inline, or inside a TabContainer tab for heavy forms -->
<Labels v-model="item.labels" :show-summary="item.id > 0" />
```

```ts
// owner data/EntityService.ts — deletion by omission: the back-end Related() sync
// replaces the whole collection, so a _deleted row must be ABSENT from the payload.
protected override prepareItem(item: Entity): Entity {
    item.labels = item.labels?.filter((x) => !x._deleted)
    return super.prepareItem(item)
}
```

- Add the owner's `Labels` includes flag to `baseQueryParams.includes` so list/detail responses carry the rows.
- **Keep input `maxlength` aligned with the back-end `[MaxLength]`** (title 64 / value 512 in the blueprint) — a longer client limit passes the form and fails server-side.
- The `_deleted` marking + `prepareItem` strip is the standard owned-collection contract — see [entities.patterns.md → Transient client-only fields](entities.patterns.md).

---

## Tenant switcher (Multi-tenancy)

Client side of the back-end **Multi-tenancy** blueprint. The active tenant lives **in the JWT** (`tenant` claim) — the SPA never sends a tenant header or route param; switching tenants means **re-minting the token**.

### Store — active tenant derived from the token

```ts
// entities/tenants/store.ts
import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { useAxios } from "regira/vue/http"
import { useAuthStore } from "regira/vue/auth"
import Entity from "./Entity"

export const useEntityStore = defineStore(Entity.name, () => {
    const authStore = useAuthStore()
    const { getClaimValue, refresh: refreshToken } = authStore
    const items = ref<Array<Entity>>()

    async function load(): Promise<void> {
        const axios = useAxios()
        items.value = await axios.get(`tenants`).then((r) => r.data)
    }
    async function setActiveTenant(id: string) {
        await refreshToken({ tenantId: id }) // POST auth/refresh/?tenantId=… → new JWT with the new `tenant` claim
    }
    const activeTenant = computed(() => items.value?.find((x) => x.id == getClaimValue("tenant")))

    // reload the tenant list whenever a token arrives (register this plugin BEFORE the auth plugin)
    authStore.$onAction(
        ({ name, after }) =>
            ["login", "refresh", "validateToken"].includes(name) &&
            after(() => {
                if (authStore.isAuthenticated) load()
            })
    )

    return { items, activeTenant, load, setActiveTenant }
})
```

### Plugin + selector

```ts
// plugin.ts — expose the active tenant app-wide
app.config.globalProperties.$activeTenant = computed(() => useEntityStore().activeTenant)
```

`TenantSelector.vue` renders one button per `items` entry, highlights the one matching `activeTenant?.id`, and calls `store.setActiveTenant(item.id)` on click. Place it in the header/user menu.

### How it works (and what to rely on)

- `authStore.refresh(o)` passes `o` as query parameters to the refresh endpoint; the back-end reads `tenantId`, rebuilds the claims for that tenant (membership verified server-side), and returns a fresh token. The axios interceptor keeps sending `Authorization: Bearer` — nothing else changes client-side.
- `activeTenant` is **derived, not stored** — `getClaimValue("tenant")` decodes the current token, so a page reload keeps the right tenant automatically.
- Per-tenant permissions arrive as claims in the same token — gate UI with `getClaimValue("permissions")` (e.g. hide write actions without `can_write`).
- After a switch, tenant-scoped stores hold rows of the _previous_ tenant — refresh them (the `$onAction` hook above covers `refresh`, so stores wired the same way reload themselves).

---

## Family tree view (Recursive entities)

Client side of the back-end **Recursive entities** blueprint: the API's tree endpoints (`GET {api}/family?ids={id}&level=9`, plus `/ancestors`, `/offspring`) return **flat rows** in parent-before-children order:

```ts
// entities/<x>/tree/FamilyItem.ts — mirrors the back-end TreeItem projection
export type FamilyItem = {
    parentId: number
    childId: number
    rootId: number
    level: number // negative = ancestor side (family endpoint)
    parent?: Entity
    child?: Entity
    root?: Entity
}
```

### Assemble the tree

Map the edge rows to one **node item per distinct id** (`toTreeItems` — the `FamilyItem → TreeItem`
step), then build a `TreeList`: roots are the ids no edge points at; children add recursively:

```ts
import { TreeList, type TreeNode } from "regira/treelist"

// One node per distinct id; `children` = the edges leaving it. `item` is hydrated later.
export class TreeItem {
    id!: number
    item?: Entity
    children: Array<TreeItem> = []
    isExpanded = false
    static create(v: object): TreeItem {
        return Object.assign(new TreeItem(), v)
    }
}

function toTreeItems(selfId: number, family: Array<FamilyItem>, reverse = false): Array<TreeItem> {
    const ids = [...new Set([selfId, ...family.flatMap(({ parentId, childId }) => [parentId, childId])])].filter((x) => x != null)
    return ids.map((id) =>
        TreeItem.create({
            id,
            children: family
                .filter((x) => (reverse ? x.childId === id : x.parentId === id))
                .map((x) => TreeItem.create({ id: reverse ? x.parentId : x.childId })),
            // rows carrying edge metadata (e.g. relationshipType)? copy it onto the child item here
        })
    )
}

export function toTree(selfId: number, family: Array<FamilyItem>, reverse = false): TreeList<TreeItem> {
    const treeItems = toTreeItems(selfId, family, reverse)
    const roots = treeItems.filter((x) => (reverse ? !family.some((f) => f.parentId == x.id) : !family.some((f) => f.childId == x.id)))
    const tree = new TreeList<TreeItem>()
    function add(item: TreeItem, parentNode?: TreeNode<TreeItem>) {
        const node = tree.addValue(item, parentNode)
        item.children.forEach((child) => {
            const found = treeItems.find((x) => child.id === x.id)
            if (found) add(TreeItem.create({ ...child, ...found }), node) // child's own edges come from its node item
        })
    }
    roots.forEach((item) => add(item))
    return tree
}
```

The built tree is "skinny" (ids only) — **hydrate `item` afterwards** with one batch fetch:
`const entities = await service.list({ ids: tree.getValues().map(x => x.id), pageSize: 0 })`, then
`tree.forEach(n => n.value.item = entities.find(e => e.id == n.value.id))`. (Alternatively read the
hydrated `parent`/`child` payloads straight off the rows when the endpoint includes them.)

> Loading the **whole** dataset instead of one entity's family? Use the packaged `useTree` +
> `IFindParents` from [entities.patterns.md → Hierarchical (tree) entities](entities.patterns.md) —
> this hand assembly is for the _server-computed_ family of a single entity (deep graphs where
> fetching everything doesn't scale). Dedupe the rows first (`distinctBy` on the `childId`+`parentId` pair —
> the family union can repeat edges).

### Render — mutual component recursion

`TreeView.vue` renders a `<ul>` of nodes via `TreeViewItem.vue`; each item re-embeds `<TreeView>` for its children — that mutual recursion draws arbitrary depth:

```html
<!-- TreeView.vue -->
<ul class="list-unstyled">
    <li v-for="node in nodes" :key="node.value.id">
        <TreeViewItem
            :node="node"
            :selected="selected"
            :engine="engine"
            @drag="handleDrag"
            @dragend="handleDragEnd"
            @drop="handleDrop"
            @toggle-node="$emit('toggle-node', $event)"
        />
    </li>
</ul>

<!-- TreeViewItem.vue (essentials) -->
<button :disabled="!node.children.length" @click="$emit('toggle-node', node)">…</button>
<span draggable="true" @dragstart="$emit('drag', node)" @dragend="$emit('dragend')">{{ nodeItem?.$title }}</span>
<TreeView
    v-show="node.value.isExpanded"
    :nodes="sortedChildren"
    :selected="selected"
    :engine="engine"
    class="tree-indent"
    @toggle-node="$emit('toggle-node', $event)"
/>
```

Share **one** `useDragDrop` engine (from `regira/vue/entities`) through the whole recursion via a prop — each level creating its own engine breaks cross-level drops. On a move: persist the edge change through the entity service first, then mirror it client-side with `tree.move(child, parent)`.

Container niceties from the reference apps (`Overview.vue`):

- expand/collapse all: `tree.getOffspring(tree.roots).forEach(n => n.value.isExpanded = …)`
- **auto-orientation**: build a throwaway tree, then invert when the entity has more ancestors than descendants — `reverse = tempTree.getAncestors(self).length > tempTree.getOffspring(self).length` (a supplier renders naturally as a root, a component as a leaf).

---

## Polymorphic entity (single class over a TPH back-end)

Client side of the back-end **Stakeholders** blueprint (or any `[JsonPolymorphic]` TPH endpoint): the API serves one route (`/parties`) with a discriminator (`partyType`) selecting the subtype payload. On the client, **don't mirror the class hierarchy** — one flattened entity class carrying the union of subtype fields keeps every composable, store, and picker working unchanged:

```ts
export const PartyTypes = { Person: "PERSON", Organization: "ORGANIZATION" } as const

export class Party extends EntityBase {
    id = 0
    partyType = "" // the discriminator — sent back verbatim on save
    code?: string
    // organization fields
    name = ""
    legalEntity?: string
    // person fields
    salutation?: string
    givenName?: string
    familyName?: string
    contactData?: PartyContactData[]
    addresses?: PartyAddress[]
    parentRelationships?: Array<PartyRelationship>
    childRelationships?: Array<PartyRelationship>

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.partyType == PartyTypes.Organization
            ? `${this.name ?? ""} ${this.legalEntity ?? ""}`.trim()
            : `${this.givenName ?? ""} ${this.familyName ?? ""}`.trim()
    }
    get $isOrganization() {
        return this.partyType == PartyTypes.Organization
    }
}
```

- **Form:** branch the subtype fields on the discriminator (`v-if="item.$isOrganization"` … `v-else`); pick the type once at create time and treat it as immutable afterwards (the back-end discriminator is `init`-only).
- **Config:** request the owned collections up front — `baseQueryParams: { includes: ["Addresses", "ContactData", "Relationships"] }` (names = the back-end `[Flags]` members).
- **Save:** the discriminator decides which input DTO the back-end binds (`PersonInputDto` vs `OrganizationInputDto`) — always send `partyType`, and only the fields of that subtype are honored.
- **Owned collections:** contact data + addresses are plain owned collections (`useOwnedCollection` + inline list — see [entities.patterns.md → Owned (child) collections](entities.patterns.md)); relations are **two** collections (`parentRelationships`/`childRelationships`), each row nesting its own `contactData`. Strip `_deleted` rows at **every** nesting level before save:

```ts
protected override prepareItem(item: Party): Party {
    item.addresses = item.addresses?.filter((x) => !x._deleted)
    item.contactData = item.contactData?.filter((x) => !x._deleted)
    for (const relations of [item.parentRelationships, item.childRelationships]) {
        relations?.forEach((r) => (r.contactData = r.contactData?.filter((c) => !c._deleted)))
    }
    item.parentRelationships = item.parentRelationships?.filter((x) => !x._deleted)
    item.childRelationships = item.childRelationships?.filter((x) => !x._deleted)
    return super.prepareItem(item)
}
```

---

## In-code recipes (how_to)

### Edit labels/tags inside an owner's form (labels editor)

<!-- how_to: key=labels-editor aliases=label-editor,labels-ui,tag-editor,tag-input,label-input,inline-labels -->

Copy the **Labels editor blueprint**: an `EntityLabel extends EntityBase` client class (`$title` =
`value`, `_deleted` mark), a small component set (draggable `Overview` + `InlineInput` rows +
read-only `ListItem`/`Summary`), client-side `getLabelType(value)` detection on every edit, and
`<Labels v-model="item.labels" />` in the owner form. Strip `_deleted` rows in the owner service's
`prepareItem` — the back-end `Related()` sync deletes by omission.

**See:** `get_package("regira_modules.vue.entities", section: "blueprints", heading: "Labels editor")`;
back-end: `get_package("Regira.Entities", section: "blueprints", heading: "EntityLabels")`.

### Switch the active tenant (tenant switcher)

<!-- how_to: key=tenant-switcher aliases=switch-tenant,active-tenant,tenant-selector,tenant-ui,multitenant-ui -->

Copy the **Tenant switcher blueprint**: a pinia store that loads `/tenants` on every auth action
(`authStore.$onAction` for `login`/`refresh`/`validateToken`), derives `activeTenant` from the JWT —
`items.find(x => x.id == getClaimValue("tenant"))` — and switches with
`authStore.refresh({ tenantId })`, which re-mints the token server-side. No tenant header: the bearer
token _is_ the tenant context. Register the tenant plugin before the auth plugin.

**See:** `get_package("regira_modules.vue.entities", section: "blueprints", heading: "Tenant switcher")`;
back-end: `get_package("Regira.Entities", section: "blueprints", heading: "Multi-tenancy")`.

### Render an entity's family tree (ancestors + descendants)

<!-- how_to: key=family-tree aliases=tree-view,treeview,family,tree-component,render-tree,expand,collapse -->

Copy the **Family tree view blueprint**: fetch flat rows from the tree endpoints
(`GET {api}/family?ids={id}&level=9`), dedupe, assemble a `TreeList` (hand `toTree` for a single
entity's family; `useTree` + `IFindParents` when the whole dataset is loaded), and render with the
mutually recursive `TreeView ⇄ TreeViewItem` pair (`v-show="node.value.isExpanded"`). Share one
`useDragDrop` engine through the recursion; on move, save through the service then
`tree.move(child, parent)`.

**See:** `get_package("regira_modules.vue.entities", section: "blueprints", heading: "Family tree view")`;
back-end: `get_package("Regira.Entities", section: "blueprints", heading: "Recursive entities")`.

### Consume a polymorphic (TPH) endpoint with one client class

<!-- how_to: key=polymorphic-entity aliases=polymorphic,discriminator,tph,subtype,person-organization,inheritance -->

Copy the **Polymorphic entity blueprint**: one flattened class with the union of subtype fields plus
the discriminator (`partyType`); `$title`/getters branch on it; the form shows subtype fields via
`v-if`; the discriminator is chosen at create time and never changed. Always send it on save — it
selects the input DTO server-side. Owned collections (incl. nested ones) strip `_deleted` at every
level in `prepareItem`.

**See:** `get_package("regira_modules.vue.entities", section: "blueprints", heading: "Polymorphic entity")`;
back-end: `get_package("Regira.Entities", section: "blueprints", heading: "Stakeholders")`.
