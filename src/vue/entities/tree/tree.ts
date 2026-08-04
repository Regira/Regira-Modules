import { ref, computed, toRaw, type Ref } from "vue"
import { TreeList, type IFindParents, TreeNode } from "../../../treelist"
import type { IEntity } from "../abstractions/IEntity"

function defaultEquals<T extends { $id: number | string }>(item1: T, item2: T) {
    return item1.$id != null && item1.$id == item2.$id && item1.constructor == item2.constructor
}
type TreeIn<T extends { $id: number | string }> = { equals(item1: T, item2: T): boolean }

export function useTree<T extends { $id: number | string }>(options?: TreeIn<T>) {
    const tree = ref<TreeList<T>>()
    const items = ref<Array<T>>()
    const equals = options?.equals || defaultEquals
    const nodes = computed(() => tree.value?.filter((n) => items.value?.some((v) => equals(n.value as T & IEntity, v as T & IEntity))) || [])
    const ancestors = computed(() => nodes.value.flatMap((n) => n.getAncestors()))
    const offspring = computed(() => nodes.value.flatMap((n) => n.getOffspring()))
    const family = computed(() => [
        ...new Set(
            nodes.value
                .flatMap((n) => n.getAncestors())
                .concat(nodes.value)
                .concat(nodes.value.flatMap((n) => n.getOffspring()))
        ),
    ])

    function init(values: Array<T>, data: Array<T>, findParents: IFindParents<T>) {
        items.value = values
        tree.value = new TreeList().init(
            data.map((x) => toRaw(x)),
            findParents
        )
        const itemsToRemove = tree.value.filter((n) => {
            if (n.parent == null) {
                return false
            }
            // ToDo: only works for 1 parent level deep for now
            return n.parent.getOffspring().some((on) => on != n && on.value == n.value)
        })
        itemsToRemove.forEach((n) => tree.value!.remove(n))
    }

    return {
        tree,
        nodes,
        ancestors,
        offspring,
        family,
        init,
    }
}

export type DragDropEmits<T = any> = {
    (e: "move", arg: { child: TreeNode<T>; parent: TreeNode<T> }): void
    (e: "drag", arg: TreeNode<T>): void
    (e: "dragend"): void
    (e: "drop", arg: TreeNode<T>): void
}

export type DragDropEngine = {
    draggingNode: Ref<TreeNode | undefined>
    handleDrag: (node: TreeNode) => void
    handleDragEnd: () => void
    handleDrop: (node: TreeNode) => void
}

export function useDragDrop<T = any>({ emit }: { emit: any }): DragDropEngine {
    const draggingNode = ref<TreeNode<T>>()

    function handleDrag(node: TreeNode<T>) {
        if (node != null) {
            draggingNode.value = node
            emit("drag", node)
        }
    }
    function handleDragEnd() {
        draggingNode.value = undefined
        emit("dragend")
    }
    function handleDrop(node: TreeNode<T>) {
        if (node == null || draggingNode.value == null || draggingNode.value == node) {
            return
        }
        const draggingNodeOffspring = draggingNode.value?.getOffspring()
        if (draggingNodeOffspring?.includes(node)) {
            return
        }

        emit("drop", node)
        emit("move", { child: draggingNode.value, parent: node })
        draggingNode.value = undefined
    }

    return {
        draggingNode,
        handleDrag,
        handleDragEnd,
        handleDrop,
    }
}
