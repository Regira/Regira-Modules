import { describe, test, expect, vi, afterEach } from "vitest";
import { createApp, h } from "vue";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import authPlugin from "../../../src/vue/auth/plugin";
import { useAuthStore } from "../../../src/vue/auth/store";

// A new token changes what the identity may see without a navigation: signing out on a gated page and signing in as
// another account keeps that page mounted, and so does a refresh (a tenant switch) that mints other roles. The guard
// has to run again for the route on screen.

// expires = exp - nbf feeds setInterval(validateToken, expires * 1000): keep it small but sane (see rehydration-ordering)
const jwtWith = (claims) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", nbf: 1_000_000, exp: 1_000_600, ...claims }))}.signature`;
const adminToken = jwtWith({ role: "Administrator" });
const userToken = jwtWith({ sub: "2", role: "User" });

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().unmount();
});

async function signedInOnAdminPage() {
  const View = { render: () => h("div") };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: View },
      { path: "/admin", name: "admin", component: View, meta: { policy: (store) => store.hasRole("Administrator") } },
      { path: "/forbidden", name: "forbidden", component: View, meta: { allowAnonymous: true } },
    ],
  });
  // auth/validate and auth/refresh answer with whatever the test hands out next
  const server = { token: adminToken };
  const axios = {
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
    post: async () => ({ status: 200, data: { token: server.token, isAuthenticated: true } }),
  };

  const app = createApp({ render: () => h("div") });
  app.use(createPinia());
  app.use(router);
  await router.push("/admin");

  app.use(authPlugin, { axios, tokenManager: { token: adminToken }, clientApp: "MyApp" });
  app.mount(document.createElement("div"));
  mounted.push(app);

  const store = useAuthStore();
  await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });
  await router.isReady();
  return { router, store, server };
}

describe("the route guard follows the identity", () => {
  test("another account signing in on a gated page is sent to forbidden", async () => {
    const { router, store, server } = await signedInOnAdminPage();
    expect(router.currentRoute.value.name).toBe("admin");

    store.logout();
    server.token = userToken;
    await store.login({ username: "user", password: "secret" });

    await vi.waitUntil(() => router.currentRoute.value.name === "forbidden", { timeout: 1000 });
    expect(router.currentRoute.value.query.url).toBe("/admin");
  });

  test("a refresh that mints other roles leaves the gated page", async () => {
    const { router, store, server } = await signedInOnAdminPage();

    server.token = userToken;
    await store.refresh({ tenantId: "other" });

    await vi.waitUntil(() => router.currentRoute.value.name === "forbidden", { timeout: 1000 });
  });

  test("the same role signing in again stays on the page", async () => {
    const { router, store, server } = await signedInOnAdminPage();

    store.logout();
    server.token = jwtWith({ sub: "3", role: "Administrator" });
    await store.login({ username: "other-admin", password: "secret" });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(router.currentRoute.value.name).toBe("admin");
  });
});
