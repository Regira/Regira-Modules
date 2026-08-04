# Regira JsLib Directives — AI Agent Instructions

Three small Vue custom directives (`regira/vue/directives`): `focus` (autofocus on mount),
`clickOutside` (call a handler when a click lands outside the element), and `grow` (auto-grow a
`<textarea>` as lines are added). Each is a plain Vue directive object **and** ships a Vue plugin
(`install`) as its default export, so you can register one or all of them.

> **Never guess** a signature — verify in [directives.signatures.md](directives.signatures.md).

## Import

```ts
import { focus, clickOutside, grow } from "regira/vue/directives"
```

Only the barrel `regira/vue/directives` is exported — there are no granular subpaths.
The `default` export of each underlying file is a plugin (an object with `install`), and the barrel
re-exports those **plugins** under the names `focus`, `clickOutside`, `grow` (it re-exports each
file's `default`, not the file's named directive-object export).

## Registering directives

The barrel exports are plugins (objects with `install`), so register them with `app.use`. Each
plugin's `install` calls `app.directive(...)` with a fixed directive name (`clickOutside`, `focus`,
`grow`), used in templates as `v-click-outside`, `v-focus`, `v-grow`:

```ts
import { focus, clickOutside, grow } from "regira/vue/directives"

app.use(focus)
app.use(clickOutside)
app.use(grow)
```

## focus

Sets autofocus on mount. `focus.mounted(el)` calls `el.focus()` after a **250 ms `setTimeout`** (it
waits for the element to settle / any open transition). Use as `v-focus` on an input or any focusable
element.

```html
<input v-focus />
```

## clickOutside

Calls the bound handler when a click occurs outside the element (and outside its descendants). On
`beforeMount` it attaches a `click` listener on `document`; the handler runs `binding.value(event)`
only when `binding.value` is a function and the click target is neither the element nor contained by it.
`unmounted` removes the listener. The event is delivered as the argument.

```html
<div v-click-outside="close">…</div>
```

## grow

Auto-grows a `<textarea>` as the user types newlines. On `input` it counts lines (`value.split("\n")`)
and, while the count is `> 1` and `<= maxGrow`, raises `el.style.minHeight` to `lines * 1.75rem` (only
ever increasing); clearing the value resets `minHeight`. Use as `v-grow` on a `<textarea>`.

```html
<textarea v-grow></textarea>
```

`maxGrow` (default **7**) is a plugin-level option, set only via the plugin install — not per-element.
The barrel export `grow` is the plugin (each file's `default`), so `app.use(grow, { maxGrow: 10 })`
to override it.

## Gotchas

- **`grow`'s `maxGrow` is global, set at install time.** The directive object reads a module-level
  `growOptions`, which is only assigned by the plugin's `install`. The barrel `grow` is that plugin, so
  always register it via `app.use(grow, …)`. Registering the underlying directive object directly with
  `app.directive("grow", obj)` without ever running the plugin's `install` leaves `growOptions`
  undefined, so the `input` callback throws on `growOptions.maxGrow`.
- **`focus` is delayed 250 ms.** Focus is not applied synchronously on mount; do not assume the element
  is focused immediately after render.
- **`clickOutside` listens on `document` `click`.** The handler fires only for `function` bindings; the
  same physical click that opens an element can also trigger it depending on event order — open from a
  separate element or stop propagation if needed.

## See also

- [directives.examples.md](directives.examples.md)
- [directives.signatures.md](directives.signatures.md)
- [regira_modules.vue.http](../../http/ai/http.instructions.md) · [regira_modules.vue.entities](../../entities/ai/entities.instructions.md)
