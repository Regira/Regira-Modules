# Regira TreeList — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/treelist`. Do not guess — look up here first.

```ts
import { TreeList, TreeNode, type IFindParents } from "@regira/modules/treelist"
// TreeList is also the default export
```

## TreeList

```ts
export type IFindParents<T = any> = (value: T, candidates: Array<T>) => Array<T>
type IParentNode<T> = TreeNode<T> | undefined // not exported

export declare class TreeList<T = any> extends Array<TreeNode<T>> {
    roots: Array<TreeNode<T>>
    constructor(collection?: Array<T>)
    static get [Symbol.species](): ArrayConstructor
    init(values?: Array<T>, findParents?: IFindParents<T>): TreeList<T>
    addValue(value: T, parentNode?: IParentNode<T>): TreeNode<T>
    addValues(values: Array<T>, parentNode?: IParentNode<T>): Array<TreeNode<T>>
    remove(node: TreeNode<T>): boolean
    move(node: TreeNode<T>, parent?: TreeNode<T>): void
    getNodes(input?: T | Array<T>): Array<TreeNode<T>>
    getRoots(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> // distinct
    getAncestors(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> // distinct
    getOffspring(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> // distinct
    getValues(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<T> // distinct
    _ensureNodeList(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>>
}
export default TreeList
```

## TreeNode

```ts
declare class TreeNode<T = any> {
    _value: T
    _parentNode: TreeNode<T> | undefined
    _level: number
    _tree: TreeList<T>
    _children: Array<TreeNode<T>>
    constructor(value: T, parentNode: TreeNode<T> | undefined, tree: TreeList<T>)
    get value(): T
    get parent(): TreeNode<T> | undefined
    get level(): number
    get children(): TreeNode<T>[]
    add(value: T): TreeNode<T>
    remove(node: TreeNode<T>): void
    update(value: T): void
    getOffspring(): TreeNode<T>[]
    getAncestors(): TreeNode<T>[]
    getRoot(): TreeNode<T>
    [Symbol.iterator](): Generator<TreeNode<T>, void, unknown>
}
export default TreeNode
```

## See also

- [treelist.instructions.md](treelist.instructions.md)
