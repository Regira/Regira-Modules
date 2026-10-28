import { describe, test, expect, vi, afterEach } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createPinia } from "pinia";
import authPlugin from "../../../src/vue/auth/plugin";
import { useAuthStore } from "../../../src/vue/auth/store";

// The plugin re-validates a signed-in token every `expires` seconds (exp - nbf). setInterval's delay is a 32-bit
// signed int, so a lifetime past 24.8 days overflowed it and the browser fired the check about every millisecond.

const MAX_TIMER_DELAY = 2 ** 31 - 1;
const jwt = (claims) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", ...claims }))}.signature`;

const mounted = [];
afterEach(() => {
  while (mounted.length) mounted.pop().unmount();
  vi.restoreAllMocks();
});

/** Signs in through the real plugin with `token` "in local storage" and returns the delays setInterval was given. */
async function signInWith(token) {
  const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
  const axios = {
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
    post: async () => ({ status: 200, data: { token, isAuthenticated: true } }),
  };

  const app = createApp(defineComponent({ setup: () => () => h("div") }));
  app.use(createPinia());
  app.config.globalProperties.$router = undefined;
  const store = useAuthStore();
  app.use(authPlugin, { axios, tokenManager: { token }, clientApp: "MyApp", enableRouteGuard: false });
  app.mount(document.createElement("div"));
  mounted.push(app);

  await vi.waitUntil(() => store.isAuthenticated, { timeout: 1000 });
  return setIntervalSpy.mock.calls.map(([, delay]) => delay);
}

describe("the token re-validation timer", () => {
  test("a short lifetime is checked once per lifetime", async () => {
    const delays = await signInWith(jwt({ nbf: 1_000_000, exp: 1_000_600 }));
    expect(delays).toContain(600_000);
  });

  test("a lifetime past 24.8 days waits the longest delay setInterval takes, not 1 ms", async () => {
    const thirtyDays = 30 * 24 * 60 * 60;
    const delays = await signInWith(jwt({ nbf: 1_000_000, exp: 1_000_000 + thirtyDays }));
    expect(delays).toContain(MAX_TIMER_DELAY);
    expect(delays.every((d) => d <= MAX_TIMER_DELAY)).toBe(true);
  });

  test("a token without exp starts no timer", async () => {
    const delays = await signInWith(jwt({}));
    expect(delays).toHaveLength(0);
  });

  test("a token without nbf takes its lifetime from iat, where exp alone read as the epoch timestamp", async () => {
    const delays = await signInWith(jwt({ iat: 1_793_000_000, exp: 1_793_003_600 }));
    expect(delays).toContain(3_600_000);
  });

  test("a token with exp but neither nbf nor iat starts no timer", async () => {
    const delays = await signInWith(jwt({ exp: 1_793_003_600 }));
    expect(delays).toHaveLength(0);
  });
});
