# Regira Lang — Examples

Verify signatures in [lang.signatures.md](lang.signatures.md).

## Install the plugin (startup)

Call once on `app`. `messages` is a dictionary or an async loader; `defaultLang` sets both the
initial and the fallback language:

```ts
import { plugin as langPlugin, useLang } from "regira/vue/lang"

// messages can be a loaded dictionary…
const translations = await fetch(`${baseUrl}/data/translations.json`).then((r) => r.json())
app.use(langPlugin, { defaultLang: "en", messages: translations })

// …or an async loader the plugin awaits for you:
app.use(langPlugin, { defaultLang: "en", messages: () => fetch(`${baseUrl}/data/translations.json`).then((r) => r.json()) })
```

## Translate in templates

The plugin installs `$t` (look up a key) and `$tm` (translate an inline per-language message, e.g. an
entity field):

```vue
<template>
    <span>{{ $t("results") }}</span>
    <FormLabel :label="$t('auth.currentPassword')" />
    <h1>{{ $tm(homeTitle) }}</h1>
</template>
```

## Read state and switch language

`useLang()` returns the shared singleton state — switch language anywhere:

```ts
import { useLang } from "regira/vue/lang"

const { langCode, translate, translateMessage, setLangCode } = useLang()
setLangCode("nl") // ignores empty values
document.title = translateMessage(configTitle)
```

A language selector binds straight to `langCode` / `setLangCode`:

```vue
<template>
    <li :class="{ 'fw-bold': langCode == 'en' }" @click="setLangCode('en')">EN</li>
    <li :class="{ 'fw-bold': langCode == 'nl' }" @click="setLangCode('nl')">NL</li>
</template>
<script setup lang="ts">
import { useLang } from "regira/vue/lang"
const { langCode, setLangCode } = useLang()
</script>
```

## Interpolate `{param}` placeholders

Pass a value map as the last argument to fill `{name}`-style placeholders:

```ts
const { translate } = useLang()
const welcomeMsg = translate("welcome", { name: auth.displayName }) // "Welcome {name}" → "Welcome Bram"
```

## See also

- [lang.instructions.md](lang.instructions.md) · [lang.signatures.md](lang.signatures.md)
