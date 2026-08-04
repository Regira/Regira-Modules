import { describe, test, expect } from "vitest";
import { effect } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { createAuth } from "../../../src/vue/auth/auth";
import { useAuthStore } from "../../../src/vue/auth/store";

// The API mints the JWT audience from `?clientApp=` on the login request, so the configured value has to
// reach the URL — it used to be declared, forwarded, and then ignored, which 401'd every later call.
// `service.options` is the single owner; `auth.clientApp` (and `$auth`) read through to it.
// AuthData base64-decodes the JWT payload, so the stub has to be shaped like one
const fakeJwt = `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0 }))}.signature`;

const harness = ({ clientApp, loginUrl } = {}) => {
  const calls = [];
  const axios = {
    post: async (url, body) => {
      calls.push({ url, body });
      return { data: { token: fakeJwt, isAuthenticated: true } };
    },
  };
  const auth = createAuth({ enabled: true, tokenManager: { token: undefined }, axios, clientApp, loginUrl });
  return { auth, calls };
};

describe("login sends the configured clientApp", () => {
  test("appends it to the default endpoint", async () => {
    const { auth, calls } = harness({ clientApp: "MyApp" });
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("auth?clientApp=MyApp");
  });

  test("posts only the credentials", async () => {
    const { auth, calls } = harness({ clientApp: "MyApp" });
    await auth.service.login("u", "p");
    expect(calls[0].body).toEqual({ username: "u", password: "p" });
  });

  test("leaves the URL alone when no clientApp is configured", async () => {
    const { auth, calls } = harness();
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("auth");
  });

  test("does not double an explicit clientApp already in loginUrl", async () => {
    // the pre-existing workaround — apps that spell it out keep working untouched
    const { auth, calls } = harness({ clientApp: "MyApp", loginUrl: "auth?clientApp=MyApp" });
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("auth?clientApp=MyApp");
  });

  test("an explicit clientApp in loginUrl wins over the option", async () => {
    const { auth, calls } = harness({ clientApp: "Option", loginUrl: "auth?clientApp=Explicit" });
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("auth?clientApp=Explicit");
  });

  test("joins with & when loginUrl already carries a query, and encodes the value", async () => {
    const { auth, calls } = harness({ clientApp: "My App & Co", loginUrl: "api/v2/auth?foo=1" });
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("api/v2/auth?foo=1&clientApp=My%20App%20%26%20Co");
  });
});

// The store is only a reactive VIEW of the plain owner: it must never hold a copy that can go stale, and
// Vue reactivity must not leak into the framework-free service layer.
describe("the store is a read-through view of the owner", () => {
  test("setClientApp writes the owner, and every reader sees it", () => {
    setActivePinia(createPinia());
    const { auth } = harness({ clientApp: "MyApp" });
    const store = useAuthStore();

    store.setClientApp("Switched");

    expect(auth.service.options.clientApp).toBe("Switched"); // the owner
    expect(auth.clientApp).toBe("Switched"); // IAuth getter ($auth reads this)
    expect(store.clientApp).toBe("Switched"); // the store view
  });

  test("a fresh read after a direct write to the owner sees it — the view caches no copy", () => {
    setActivePinia(createPinia());
    const { auth } = harness({ clientApp: "MyApp" });
    const store = useAuthStore();

    auth.service.options.clientApp = "Direct";

    expect(store.clientApp).toBe("Direct");
  });

  test("but only setClientApp notifies Vue — a direct write to the owner re-runs nothing", () => {
    // the scope of the guarantee above: reads are always truthful, propagation needs the supported writer.
    // Mutating service.options by hand skips the ref's setter, so anything already rendered stays stale.
    setActivePinia(createPinia());
    const { auth } = harness({ clientApp: "MyApp" });
    const store = useAuthStore();

    const seen = [];
    effect(() => seen.push(store.clientApp));

    auth.service.options.clientApp = "Direct";
    expect(seen).toEqual(["MyApp"]); // no re-run

    store.setClientApp("ViaSetter");
    expect(seen).toEqual(["MyApp", "ViaSetter"]);
  });

  test("the view is reactive: a switch re-runs effects that read it", () => {
    setActivePinia(createPinia());
    harness({ clientApp: "MyApp" });
    const store = useAuthStore();

    const seen = [];
    effect(() => seen.push(store.clientApp));
    store.setClientApp("Switched");

    expect(seen).toEqual(["MyApp", "Switched"]);
  });
});

describe("clientApp has a single owner", () => {
  test("auth.clientApp reads through to the service options", () => {
    const { auth } = harness({ clientApp: "MyApp" });
    expect(auth.clientApp).toBe("MyApp");
  });

  test("a runtime switch is visible on every reader and on the next login", async () => {
    // what setClientApp() does — writing the owner must not leave auth.clientApp behind as a stale mirror
    const { auth, calls } = harness({ clientApp: "MyApp" });
    auth.service.options.clientApp = "Other";

    expect(auth.clientApp).toBe("Other");
    await auth.service.login("u", "p");
    expect(calls[0].url).toBe("auth?clientApp=Other");
  });
});
