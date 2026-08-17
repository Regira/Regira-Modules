import { describe, test, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, h, onMounted } from "vue";
import { createPinia } from "pinia";
import authPlugin from "../../../src/vue/auth/plugin";
import { useAuthStore } from "../../../src/vue/auth/store";

// Rehydrating a token from local storage is asynchronous, but `app.use()` cannot await a plugin's
// `install`, so `app.mount()` runs first and every view mounts with `isAuthenticated === false` — even
// though the app is about to be authenticated. Two things follow, and they pull in opposite directions:
// the bearer header is attached SYNCHRONOUSLY (so an unguarded fetch on mount already carries the token
// and succeeds — this is why auto-login looks seamless), while a fetch GUARDED on `isAuthenticated` is
// skipped and is never retried by an `$onAction(… "login" …)` hook, because restoring a token dispatches
// `validateToken`, not `login`.

// AuthData base64-decodes the JWT payload, so the stub has to be shaped like one. `expires` is exp - nbf and
// the plugin turns it into setInterval(validateToken, expires * 1000) — keep the span small but sane (600s)
// so the re-validation timer never fires during the run. A far-future `exp` with nbf 0 overflows setInterval's
// 32-bit delay and Node clamps it to 1ms, re-validating on every tick for the rest of the suite.
const fakeJwt = `header.${btoa(JSON.stringify({ sub: "1", name: "u", nbf: 1_000_000, exp: 1_000_600 }))}.signature`;

// Each test mounts a real app; unmount it so its auth watcher and interval are disposed.
const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().unmount();
});

/** Mounts an app through the real auth plugin with a token already "in local storage". */
function mountWithStoredToken() {
  const requests = [];
  const actions = [];
  const requestInterceptors = [];

  const axios = {
    interceptors: {
      request: { use: (fn) => requestInterceptors.push(fn) },
      response: { use: () => {} },
    },
    post: async (url) => {
      // record what the interceptor would have put on the wire
      const config = requestInterceptors.reduce((c, fn) => fn(c), { url, headers: {} });
      requests.push({ url, authorization: config.headers["Authorization"] });
      return { status: 200, data: { token: fakeJwt, isAuthenticated: true } };
    },
  };

  const seenOnMounted = {};
  const Probe = defineComponent({
    setup() {
      const store = useAuthStore();
      onMounted(() => {
        seenOnMounted.isAuthenticated = store.isAuthenticated;
      });
      return () => h("div");
    },
  });

  const app = createApp(Probe);
  app.use(createPinia());
  app.config.globalProperties.$router = undefined;

  // Subscribe BEFORE the plugin: `install` runs synchronously up to its first await, which is
  // `await store.validateToken()` — so the rehydration action is dispatched during `app.use(...)` itself.
  const store = useAuthStore();
  store.$onAction(({ name }) => actions.push(name));

  app.use(authPlugin, {
    axios,
    tokenManager: { token: fakeJwt }, // a valid token already present, as after F5
    clientApp: "MyApp",
    enableRouteGuard: false,
  });

  const root = document.createElement("div");
  app.mount(root); // synchronous — exactly what main.ts does, without awaiting app.use()
  mounted.push(app);

  return { app, store, requests, actions, seenOnMounted };
}

describe("token rehydration ordering on a hard reload", () => {
  test("a view mounts BEFORE the stored token has been validated", async () => {
    const { seenOnMounted, store } = mountWithStoredToken();

    // the whole point: at mount time the flag is still false...
    expect(seenOnMounted.isAuthenticated).toBe(false);

    await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });
    // ...and only afterwards does rehydration land
    expect(store.isAuthenticated).toBe(true);
  });

  test("rehydration dispatches validateToken and never login", async () => {
    const { store, actions } = mountWithStoredToken();
    await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });

    expect(actions).toContain("validateToken");
    // a `$onAction(… name == "login" …)` hook therefore stays silent on F5
    expect(actions).not.toContain("login");
  });

  test("the bearer header is attached synchronously, so a fetch on mount still carries the token", async () => {
    const { store, requests } = mountWithStoredToken();
    await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });

    // this is why auto-login works and why unguarded scaffolded views load fine
    expect(requests[0].url).toBe("auth/validate");
    expect(requests[0].authorization).toBe(`Bearer ${fakeJwt}`);
  });
});
