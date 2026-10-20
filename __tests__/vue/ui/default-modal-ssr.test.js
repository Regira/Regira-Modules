// @vitest-environment node
import { describe, test, expect, vi } from "vitest"
import { createSSRApp, h } from "vue"
import { renderToString } from "vue/server-renderer"

import DefaultModal from "../../../src/vue/ui/modal/DefaultModal.vue"

// Server-side rendering has no document: the modal's focus handling must leave it alone, as screen and autocomplete do
describe("DefaultModal without a DOM", () => {
    test.each([true, false])("renders on the server with isVisible %s, reporting no error", async (isVisible) => {
        const errorHandler = vi.fn()
        const app = createSSRApp({ render: () => h(DefaultModal, { isVisible, title: "t" }) })
        app.config.errorHandler = errorHandler

        await renderToString(app)
        await new Promise((resolve) => setTimeout(resolve))

        expect(errorHandler).not.toHaveBeenCalled()
    })
})
