# Regira TreeList — Examples

Verify signatures in [treelist.signatures.md](treelist.signatures.md).

## Build from a flat list with `init`

`init(values, findParents)` wires a flat array into a hierarchy. `findParents(value, candidates)`
returns the parent value(s) of `value` from the whole list, and `init` returns the tree. This is how
`buildNavigationTree` works (it matches on `parentId`):

```ts
import { TreeList } from "@regira/modules/treelist"

const tree = new TreeList<FamilyItem>().init(items, (value, candidates) => {
    const parent = candidates.find((c) => c.id === value.parentId)
    return parent ? [parent] : []
})
```

## Build imperatively with `addValue`

Omit (or pass `undefined`) for a root, or a parent `TreeNode` to nest under it:

```ts
import { TreeList, type TreeNode } from "@regira/modules/treelist"

const tree = new TreeList<TreeItem>()
function add(item: TreeItem, parentNode?: TreeNode<TreeItem>) {
    const node = tree.addValue(item, parentNode) // root when parentNode is omitted
    item.children?.forEach((child) => add(child, node)) // recurse to nest children
}
roots.forEach((item) => add(item))
```

## Navigate the tree

All `TreeList` navigation helpers default to the whole tree when called with no argument:

```ts
tree.getRoots() // distinct root ancestors
tree.getOffspring(tree.roots) // every descendant under the roots
const nodes = tree.getNodes() // every node; or getNodes(value) to look one up

// from a single node:
const ancestors = node.getAncestors() // its parents-of-parents
const descendants = node.getOffspring() // everything below it
```

## Re-parent a node

`move` detaches the node from its current parent and re-attaches it under another; omitting `parent`
(or passing `undefined`) re-attaches it as a root:

```ts
tree.move(child, parent) // child and parent are TreeNode<T>
tree.move(child) // make child a root again
```

## Render nodes in a template

A `TreeNode` exposes `value` and `children` (read-only getters), so you can recurse in markup:

```vue
<script setup lang="ts">
import type { TreeNode } from "@regira/modules/treelist"
defineProps<{ node: TreeNode<INavItem> }>()
</script>
<template>
    <li>
        {{ node.value.title }}
        <ul v-if="node.children.length">
            <NavItem v-for="child in node.children" :key="child.value.id" :node="child" />
        </ul>
    </li>
</template>
```

## Build from an API's tree endpoints (family rows)

A Regira Entities back-end with recursive-entity support serves flat `{ parentId, childId, level, rootId }`
rows from `GET {api}/family|ancestors|offspring`. Assemble those into a `TreeList` and render with a
recursive component pair — full worked slice (assembly, expand/collapse, drag-move):
`get_package("regira_modules.vue.entities", section: "blueprints", heading: "Family tree view")`.

## See also

- [treelist.instructions.md](treelist.instructions.md) · [treelist.signatures.md](treelist.signatures.md)
