# Regira Directives (front-end)

`regira/vue/directives` — three small Vue custom directives. Each is exported as a directive
object (and ships a Vue plugin as its file `default`), so you can register them individually or via
`app.use`.

## What it provides

| Export         | Purpose                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| `focus`        | Autofocus directive (`v-focus`): calls `el.focus()` ~250 ms after mount.                              |
| `clickOutside` | `v-click-outside`: runs the bound handler when a click lands outside the element.                     |
| `grow`         | `v-grow`: auto-grows a `<textarea>`'s `minHeight` as newlines are added (up to `maxGrow`, default 7). |
