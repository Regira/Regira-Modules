# Regira TreeList (front-end)

`regira/treelist` — a generic, framework-agnostic hierarchical data structure: a `TreeList<T>`
of `TreeNode<T>` items with helpers to navigate ancestors, offspring and roots. Plain TypeScript (no
Vue, no axios). The [entities tree](../vue/entities/README.md) composable and `buildNavigationTree`
are both built on it.

## What it provides

| Export            | Purpose                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `TreeList<T>`     | Tree container; extends `Array<TreeNode<T>>` and keeps a separate `roots` array. Also the default export.    |
| `TreeNode<T>`     | A node: `value`, `parent`, `level`, `children`, plus `add` / `update` / `remove` and navigation helpers.     |
| `IFindParents<T>` | `(value, candidates) => parents[]` — the callback `TreeList.init` uses to wire a flat list into a hierarchy. |

Build from a flat list with `new TreeList<T>().init(values, findParents)`, or imperatively via the
constructor / `addValue` / `addValues`. Navigate with `getRoots`, `getAncestors`, `getOffspring`,
`getNodes`, `getValues`; mutate with `remove` (cascades to descendants) and `move` (re-parent).
