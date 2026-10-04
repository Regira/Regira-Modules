import { describe, test, expect, vi, afterEach } from "vitest";
import { createApp, h } from "vue";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import authPlugin from "../../../src/vue/auth/plugin";
import { useAuthStore } from "../../../src/vue/auth/store";

// The router starts its first navigation when it is installed, while the auth plugin awaits validateToken before it
// registers the route guard. A reload or deep link to a role-gated page therefore went through unchecked: the plugin
// has to run the guard for the route already shown once it is registered.

// expires = exp - nbf feeds setInterval(validateToken, expires * 1000): keep it small but sane (see rehydration-ordering)
const jwtWith = (claims) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", nbf: 1_000_000, exp: 1_000_600, ...claims }))}.signature`;

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().unmount();
});

async function reloadOn(path, token) {
  const View = { render: () => h("div") };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: View },
      { path: "/admin", name: "admin", component: View, meta: { policy: (store) => store.hasRole("Administrator") } },
      { path: "/forbidden", name: "forbidden", component: View, meta: { allowAnonymous: true } },
    ],
  });
  const axios = {
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
    post: async () => ({ status: 200, data: { token, isAuthenticated: true } }),
  };

  const app = createApp({ render: () => h("div") });
  app.use(createPinia());
  app.use(router);
  // the page the browser reloads on: the router navigates there before the plugin has validated the token
  await router.push(path);

  app.use(authPlugin, { axios, tokenManager: { token }, clientApp: "MyApp" });
  app.mount(document.createElement("div"));
  mounted.push(app);

  const store = useAuthStore();
  await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });
  return router;
}

describe("the route guard covers the first navigation", () => {
  test("a signed-in non-admin reloading an admin page is sent to forbidden", async () => {
    const router = await reloadOn("/admin", jwtWith({ role: "User" }));

    await vi.waitUntil(() => router.currentRoute.value.name === "forbidden", { timeout: 1000 });
    expect(router.currentRoute.value.query.url).toBe("/admin");
  });

  test("an administrator reloading the same page stays on it", async () => {
    const router = await reloadOn("/admin", jwtWith({ role: "Administrator" }));
    await router.isReady();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(router.currentRoute.value.name).toBe("admin");
  });

  test("a later navigation is still checked by the registered guard", async () => {
    const router = await reloadOn("/", jwtWith({ role: "User" }));
    await router.push("/admin");

    expect(router.currentRoute.value.name).toBe("forbidden");
  });
});
