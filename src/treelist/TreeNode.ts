import type TreeList from "./TreeList"

class TreeNode<T = any> {
    _value: T
    _parentNode: TreeNode<T> | undefined
    _level: number
    _tree: TreeList<T>
    _children: Array<TreeNode<T>>

    constructor(value: T, parentNode: TreeNode<T> | undefined = undefined, tree: TreeList<T>) {
        this._value = value
        this._parentNode = parentNode
        this._level = parentNode ? parentNode.level + 1 : 0
        this._tree = tree
        this._children = []
    }

    get value() {
        return this._value
    }
    get parent() {
        return this._parentNode
    }
    get level() {
        return this._level
    }
    get children() {
        return this._children
    }
    add(value: T): TreeNode<T> {
        const node = new TreeNode(value, this, this._tree)
        node._level = this.level + 1
        this._children.push(node)
        this._tree.push(node)
        return node
    }
    remove(node: TreeNode<T>) {
        this._tree.remove(node)
    }
    update(value: T) {
        this._value = value
    }

    getOffspring() {
        return this._tree.getOffspring(this)
    }
    getAncestors() {
        return this._tree.getAncestors(this)
    }
    getRoot() {
        return this._tree.getRoots(this)[0]
    }

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child
        }
    }
}

export default TreeNode
