<!-- Owned-collection editor for __Parent__.__Children__ — an editable table of scalar rows.
     Bind it in the parent Form.vue to the ARRAY: <__Child__Overview v-model="item.__children__" />
     Removal marks `_deleted` (undoable until save); the parent's EntityService.prepareItem drops flagged
     rows so `Related()` deletes them by omission. New rows mint negative temp ids and insert with save(). -->
<script setup lang="ts">
import { useOwnedCollection } from "@regira/modules/vue/entities"
import __Child__ from "./Entity"

const props = defineProps<{ modelValue?: Array<__Child__>; readonly?: boolean }>()
const emit = defineEmits<{ "update:modelValue": [Array<__Child__>] }>()
// items: writable computed over the collection (never undefined — [] until the parent has one)
// newItem: the add-row, minted by createRow so the model's field defaults and getters are present
// handleSave: appends newItem with a negative temp id, then mints the next add-row
const { items, newItem, handleSave } = useOwnedCollection<__Child__>({ props, emit, createRow: () => new __Child__() })
</script>

<template>
    <div class="__childrenSlug__-editor">
        <div v-for="row in items" :key="row.id" class="row g-2 mb-1 align-items-center" :class="{ 'is-deleted': row._deleted }">
            <!-- TODO: one input per scalar field of __Child__ -->
            <div class="col"><input v-model="row.description" :readonly="readonly || row._deleted" class="form-control" placeholder="description" /></div>
            <div class="col-3"><input type="number" v-model.number="row.quantity" :readonly="readonly || row._deleted" class="form-control" placeholder="qty" /></div>
            <div v-if="!readonly" class="col-auto">
                <button type="button" class="btn btn-outline-danger" :title="row._deleted ? 'Restore' : 'Remove'" @click="row._deleted = !row._deleted">
                    {{ row._deleted ? "↺" : "×" }}
                </button>
            </div>
        </div>
        <div v-if="newItem && !readonly" class="row g-2 mb-1 align-items-center"><!-- add-row -->
            <div class="col"><input v-model="newItem.description" class="form-control" placeholder="description" @keyup.enter="handleSave({ saved: newItem, isNew: true })" /></div>
            <div class="col-3"><input type="number" v-model.number="newItem.quantity" class="form-control" placeholder="qty" /></div>
            <div class="col-auto"><button type="button" class="btn btn-success" @click="handleSave({ saved: newItem, isNew: true })">+</button></div>
        </div>
    </div>
</template>
