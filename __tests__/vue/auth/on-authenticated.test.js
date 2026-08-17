import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { setActivePinia, createPinia } from "pinia";
import { createAuth, setGlobalAuth } from "../../../src/vue/auth/auth";
import { useAuthStore } from "../../../src/vue/auth/store";
import { onAuthenticated } from "../../../src/vue/auth/onAuthenticated";

// `onAuthenticated` exists because enumerating store action names is fragile — a hook listening for
// "login" misses the `validateToken` that restores a stored token on reload. Watching the TOKEN instead
// fixes that and adds a second property the boolean `isAuthenticated` cannot give: a refresh that swaps
// the token while staying authenticated (a tenant switch) still fires, while re-validating the SAME token
// (the plugin's periodic check) does not.

const jwt = (claims = {}) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0, ...claims }))}.signature`;

const tokenA = jwt({ tenant: "a" });
const tokenB = jwt({ tenant: "b" });

/** Auth wired over a stubbed API whose next token you control. */
function harness({ storedToken } = {}) {
    const tokenManager = { token: storedToken };
    let nextToken = tokenA;
    const axios = {
        post: async () => ({ status: 200, data: { token: nextToken, isAuthenticated: true } }),
    };
    createAuth({ enabled: true, tokenManager, axios, clientApp: "MyApp" });
    return { store: useAuthStore(), setNextToken: (t) => (nextToken = t), tokenManager };
}

/** Registers the handler inside an effect scope, as a component's setup would. */
function track(fn) {
    const calls = { count: 0 };
    const scope = effectScope();
    scope.run(() => onAuthenticated(() => { calls.count++; fn?.(); }));
    return { calls, scope };
}

beforeEach(() => setActivePinia(createPinia()));
// `globalAuth` is module-level state the plugin owns; the tests below set it, so clear it or the ones
// relying on the default-store fallback would read a leftover from an earlier test.
afterEach(() => setGlobalAuth(undefined));

describe("onAuthenticated", () => {
    test("does not fire while unauthenticated", () => {
        harness();
        const { calls } = track();
        expect(calls.count).toBe(0);
    });

    test("fires immediately when a token is already present (mount after login)", async () => {
        const { store } = harness();
        await store.login({ username: "u", password: "p" });

        const { calls } = track();
        expect(calls.count).toBe(1);
    });

    test("fires when a stored token is validated on reload — the case a login-only hook misses", async () => {
        const { store } = harness({ storedToken: tokenA });

        const { calls } = track();
        expect(calls.count).toBe(0); // mounted before rehydration, as views really do

        await store.validateToken();
        await nextTick();
        expect(calls.count).toBe(1);
    });

    test("fires again when a refresh swaps the token — the case watching isAuthenticated misses", async () => {
        const { store, setNextToken } = harness();
        await store.login({ username: "u", password: "p" });
        const { calls } = track();
        expect(calls.count).toBe(1);

        setNextToken(tokenB); // e.g. refresh({ tenantId }) — still authenticated, new identity
        await store.refresh({ tenantId: "b" });
        await nextTick();
        expect(calls.count).toBe(2);
    });

    test("does NOT re-fire when the same token is re-validated (the plugin's periodic check)", async () => {
        const { store } = harness({ storedToken: tokenA });
        await store.validateToken();
        const { calls } = track();
        expect(calls.count).toBe(1);

        await store.validateToken(); // same token comes back
        await nextTick();
        expect(calls.count).toBe(1);
    });

    test("does not fire on logout", async () => {
        const { store } = harness();
        await store.login({ username: "u", password: "p" });
        const { calls } = track();

        store.logout();
        await nextTick();
        expect(calls.count).toBe(1);
    });

    test("immediate: false skips the already-authenticated call", async () => {
        const { store } = harness();
        await store.login({ username: "u", password: "p" });

        let count = 0;
        const scope = effectScope();
        scope.run(() => onAuthenticated(() => count++, { immediate: false }));
        expect(count).toBe(0);
    });
});

// The plugin resolves `authStore ?? useAuthStore()`, so an app passing its own store never populates the
// default one. Reading the default directly would watch a store that stays empty forever: no immediate
// call, no later change, and every scaffolded view silently stops reloading. `$auth` is the accessor that
// honours whichever store the plugin was configured with.
describe("onAuthenticated store resolution", () => {
    /** A stand-in for `$auth`, whose `authData` getter reads through to a custom store. */
    function globalAuthOver(authData) {
        setGlobalAuth({
            enabled: true,
            get authData() {
                return authData.value;
            },
        });
    }

    test("follows the store the plugin was configured with, not the default one", async () => {
        harness(); // default store exists and stays signed out
        const customAuthData = ref({ token: undefined, isAuthenticated: false });
        globalAuthOver(customAuthData);

        const { calls } = track();
        expect(calls.count).toBe(0);

        customAuthData.value = { token: tokenA, isAuthenticated: true };
        await nextTick();

        expect(calls.count).toBe(1);
        expect(useAuthStore().isAuthenticated).toBe(false); // proof it was NOT the default store that fired
    });

    test("an explicit { store } wins over both", async () => {
        harness();
        globalAuthOver(ref({ token: tokenA, isAuthenticated: true })); // would fire immediately
        const explicit = ref({ token: undefined, isAuthenticated: false });

        let count = 0;
        const scope = effectScope();
        scope.run(() =>
            onAuthenticated(() => count++, {
                store: {
                    get authData() {
                        return explicit.value;
                    },
                },
            })
        );
        expect(count).toBe(0);

        explicit.value = { token: tokenB, isAuthenticated: true };
        await nextTick();
        expect(count).toBe(1);
    });

    test("falls back to the default store when the plugin has not installed yet", async () => {
        const { store } = harness(); // no setGlobalAuth — e.g. a pinia store built before app.use(authPlugin)

        const { calls } = track();
        await store.login({ username: "u", password: "p" });
        await nextTick();

        expect(calls.count).toBe(1);
    });

    test("does not fire for a token the store has not accepted", async () => {
        harness();
        const customAuthData = ref({ token: undefined, isAuthenticated: false });
        globalAuthOver(customAuthData);
        const { calls } = track();

        // a custom IAuthService may build AuthData around a token it rejected
        customAuthData.value = { token: tokenA, isAuthenticated: false };
        await nextTick();

        expect(calls.count).toBe(0);
    });
});
