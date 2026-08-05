<template>
    <div class="row border-bottom py-2">
        <div class="col-auto">
            <!-- Row-edit affordance follows config.isComplex: a real entity (page) links to its Details route;
                 a very basic entity (modal) opens FormModalButton. Forward @remove either way so a delete from
                 inside the modal refreshes the pooled overview — without it the deleted row lingers until reload. -->
            <RouterLink v-if="config.isComplex" :to="{ name: config.key + 'Details', params: { id: item.$id } }" class="btn btn-link p-1">
                <Icon name="edit" />
            </RouterLink>
            <FormModalButton v-else v-model="item" @save="$emit('save', $event)" @remove="$emit('remove', $event)" />
        </div>

        <div class="col text-truncate">{{ item.$title }}</div>
        <!-- TODO: mirror List.vue's header slots 1:1 — same classes, same order, `text-truncate` on every
             text cell. A relation cell is the related entity's FormModalButton + its pooled label
             (`scaffold.mjs --rel <Related>` already wrote one above per relation); plain text is the
             exception — see entities.patterns.md → Resolving relations with fromPool.
        <div class="col d-none d-md-block text-truncate">{{ item.code }}</div>
        <div class="col d-none d-lg-block text-truncate">{{ item.status }}</div>
        <div class="col d-none d-xl-block text-truncate">{{ item.reference }}</div>
        -->
        <div class="col-2 d-none d-lg-block text-truncate">{{ formatDate(item.created) }}</div>

        <div class="col-auto">
            <ConfirmButton icon="delete" :modal-type="ModalType.danger" @confirm="$emit('request-remove', item)">
                {{ $t("deleteItem", { title: item?.$title }) }}
            </ConfirmButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router"
import { ModalType, ConfirmButton, Icon } from "@regira/modules/vue/ui"
import { formatDate } from "@regira/modules/vue/formatters"
import type { SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import FormModalButton from "../details/FormModalButton.vue"

const emit = defineEmits<{
    (e: "update:modelValue", value: Entity): void
    (e: "save", value: SaveResult<Entity>): void
    (e: "remove", value: Entity): void
    (e: "request-save", value: Entity): void
    (e: "request-remove", value: Entity): void
}>()
defineProps<{ readonly?: boolean }>()

const item = defineModel<Entity>({ required: true })
</script>
