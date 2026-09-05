import { describe, test, expect } from "vitest"
import { importNavbar, importDashboard, isNavItem } from "../../../src/vue/entities/navigation/functions"

const configs = [
    { key: "Ticket", name: "Ticket", overviewTitle: "Tickets" },
    { key: "Agent", name: "Agent", overviewTitle: "Agents" },
]
const groups = [{ id: "admin", title: "Administration", icon: "gear" }]

describe("navigation groups whose children are all gated away", () => {
    // `hasAccess` is the hook a slice fills in to hide admin-only entities from a customer. Emitting the
    // parent anyway renders a dropdown that opens onto nothing.
    test("importNavbar drops a group once hasAccess filtered every child out", () => {
        const nav = importNavbar({ groups, entities: [["admin", ["Ticket", "Agent"]]], configs, hasAccess: () => false })

        expect(nav).toEqual([])
    })

    test("importNavbar keeps the group while any child survives", () => {
        const nav = importNavbar({
            groups,
            entities: [["admin", ["Ticket", "Agent"]]],
            configs,
            hasAccess: (config) => config.key === "Ticket",
        })

        expect(nav.filter((x) => !isNavItem(x)).map((x) => x.id)).toEqual(["admin"])
        expect(nav.filter(isNavItem).map((x) => x.id)).toEqual(["Ticket"])
    })

    test("importDashboard drops it too — the two importers agree", () => {
        const nav = importDashboard({ groups, entities: [["admin", ["Ticket"]]], configs, hasAccess: () => false })

        expect(nav).toEqual([])
    })
})
