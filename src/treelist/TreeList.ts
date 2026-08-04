import TreeNode from "./TreeNode"
import { isIterable, toArray, distinct } from "../utilities/array-utility"

export type IFindParents<T = any> = (value: T, candidates: Array<T>) => Array<T>
type IParentNode<T> = TreeNode<T> | undefined

export class TreeList<T = any> extends Array<TreeNode<T>> {
    roots: Array<TreeNode<T>>
    constructor(collection?: Array<T>) {
        super()
        this.roots = []
        Array.isArray(collection) && this.init(collection)
    }

    // returnType becomes Array when using array-functions on this TreeList
    static get [Symbol.species]() {
        return Array
    }

    init(values: Array<T> = [], findParents: IFindParents<T> = (_value, _candidates) => []): TreeList<T> {
        this.length = 0
        this.roots = []
        const addNode = (value: T) => {
            const parents = findParents(value, values)
            if (!parents.length) {
                // Reuse an existing root instead of adding a duplicate: a parent may already have been
                // synthesised as a root while visiting one of its children earlier in `values`.
                return this.roots.find((x) => x.value === value) ?? this.addValue(value)
            }
            parents.forEach((parent) => {
                const parentNode = this.find((x) => x.value === parent) || addNode(parent)
                this.addValue(value, parentNode)
            })
            return undefined
        }
        values.forEach(addNode)

        return this
    }
    addValue(value: T, parentNode?: IParentNode<T>): TreeNode<T> {
        return this.addValues([value], parentNode)[0]!
    }
    addValues(values: Array<T>, parentNode?: IParentNode<T>): Array<TreeNode<T>> {
        if (!parentNode) {
            const nodes = values.map((v) => new TreeNode(v, undefined, this))
            this.push(...nodes)
            this.roots.push(...nodes)
            return nodes
        }
        return values.map((v) => parentNode.add(v))
    }

    remove(node: TreeNode<T>): boolean {
        if (node?.children?.length > 0) {
            node.children.forEach((c) => this.remove(c))
        }
        if (node.parent != null) {
            const childIndex = node.parent._children.findIndex((n) => n === node)
            if (childIndex !== -1) {
                node.parent._children.splice(childIndex, 1)
            }
        } else {
            const rootIndex = this.roots.findIndex((n) => n === node)
            if (rootIndex !== -1) {
                this.roots.splice(rootIndex, 1)
            }
        }

        const index = this.findIndex((n) => n === node)
        if (index !== -1) {
            this.splice(index, 1)
            return true
        }
        return false
    }
    move(node: TreeNode<T>, parent?: TreeNode<T>) {
        if (node.parent != null) {
            const childIndex = node.parent.children.findIndex((n) => n === node)
            if (childIndex !== -1) {
                node.parent.children.splice(childIndex, 1)
            }
        } else {
            const rootIndex = this.roots.findIndex((n) => n === node)
            if (rootIndex !== -1) {
                this.roots.splice(rootIndex, 1)
            }
        }

        if (parent != null) {
            if (!parent.children.includes(node)) {
                parent.children.push(node)
            }
        } else {
            if (!this.roots.includes(node)) {
                this.roots.push(node)
            }
        }

        node._parentNode = parent
    }

    /**
     * Retrieves all TreeNodes for the given value(s)
     * @param {any} values (default undefined so we can treat null as a valid value)
     * @returns {Array<TreeNode>} collection of TreeNodes
     */
    getNodes(input?: T | Array<T>): Array<TreeNode<T>> {
        if (input == null) {
            return [...this]
        }

        const values = (isIterable(input) ? input : [input]) as Array<T>

        const arr = toArray(values) as Array<T>
        return this.filter((node) => arr.includes(node.value))
    }
    /**
     * Retrieves all roots for the given TreeNode(s)
     * @param {Array<TreeNode>|TreeNode} nodes
     * @returns {Array<TreeNode>} collection of TreeNodes
     */
    getRoots(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> {
        if (nodes == null) {
            return [...this.roots]
        }

        nodes = this._ensureNodeList(nodes)

        const roots = nodes.map((node) => {
            let parent = node
            while (parent.parent) {
                parent = parent.parent
            }
            return parent
        })
        return distinct(roots)
    }
    /**
     * Retrieves all parents and their parents for the given TreeNode(s)
     * @param {Array<TreeNode>|TreeNode} nodes (or values)
     * @returns {Array<TreeNode>} collection of TreeNodes
     */
    getAncestors(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> {
        nodes = this._ensureNodeList(nodes)
        const getParents = (node: TreeNode<T>): Array<TreeNode<T>> => (node.parent ? [node.parent].concat(getParents(node.parent)) : [])
        const ancestors = nodes.flatMap(getParents)
        return distinct(ancestors)
    }
    /**
     * Retrieves all children and their children for the given TreeNode(s)
     * @param {Array<TreeNode>|TreeNode} nodes
     * @returns {Array<TreeNode>} collection of TreeNodes
     */
    getOffspring(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> {
        nodes = this._ensureNodeList(nodes)
        const getChildren = (node: TreeNode<T>): Array<TreeNode<T>> =>
            node.children.length > 0 ? [...node.children, ...node.children.flatMap(getChildren)] : []
        return nodes.flatMap(getChildren)
    }
    /**
     * Retrieves all (distinct) values from this TreeList
     * @returns {Array<Object>} collection of values
     */
    getValues(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<T> {
        nodes = this._ensureNodeList(nodes)
        return nodes.map((x) => x.value)
    }

    _ensureNodeList(nodes?: TreeNode<T> | Array<TreeNode<T>>): Array<TreeNode<T>> {
        if (nodes instanceof TreeNode) {
            return [nodes]
        }

        return nodes || this
    }
}

export default TreeList
