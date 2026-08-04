import { describe, test, expect } from "vitest";
import { EntityServiceBase, isNewEntity } from "../../../src/vue/entities/abstractions";

describe("isNewEntity", () => {
  test.each([
    [null, true],
    [undefined, true],
    ["new", true],
    ["", true],
    [0, true],
    [-1, true], // negative temp id minted for a new owned/related-collection row
    [-42, true],
    [5, false],
    [1, false],
    ["42", false],
    ["a1b2c3", false],
  ])("isNewEntity(%p) === %p", (id, expected) => {
    expect(isNewEntity(id)).toBe(expected);
  });
});

// A model that returns a bare numeric key from $id (id = 0 for a fresh instance).
// Before the fix this pattern silently issued PUT /0 instead of POST on create.
class Model {
  constructor(id = 0) {
    this.id = id;
    this.name = "x";
  }
  get $id() {
    return this.id;
  }
  get $title() {
    return this.name;
  }
}

class TestService extends EntityServiceBase {
  toEntity(item) {
    return Object.assign(new Model(), item);
  }
}

function makeService() {
  const calls = [];
  const axios = {
    post: async (url, body) => (calls.push({ method: "POST", url }), { data: { item: body } }),
    put: async (url, body) => (calls.push({ method: "PUT", url }), { data: { item: body } }),
    get: async () => ({ data: { item: null } }),
    delete: async () => ({ data: {} }),
  };
  const service = new TestService(axios, { key: "test", api: "/api/models" });
  return { service, calls };
}

// A string/Guid-keyed model. strictPropertyInitialization forces an initializer, and "" is the only sensible
// one — so the payload used to carry id: "" and the server answered 400 ("The JSON value could not be
// converted to System.Nullable`1[System.Guid]") on every create from the SPA.
class GuidModel {
  constructor(id = "") {
    this.id = id;
    this.name = "x";
  }
  get $id() {
    return this.id || "new";
  }
  get $title() {
    return this.name;
  }
}

class GuidService extends EntityServiceBase {
  toEntity(item) {
    return Object.assign(new GuidModel(), item);
  }
}

describe("EntityServiceBase.save dispatch", () => {
  test("inserts a fresh model whose $id is a bare 0 (POST, no id in URL)", async () => {
    const { service, calls } = makeService();
    const { isNew } = await service.save(new Model(0));
    expect(isNew).toBe(true);
    expect(calls).toEqual([{ method: "POST", url: "/api/models" }]);
  });

  test("inserts a new related-collection row carrying a negative temp id (POST)", async () => {
    const { service, calls } = makeService();
    const { isNew } = await service.save(new Model(-1));
    expect(isNew).toBe(true);
    expect(calls).toEqual([{ method: "POST", url: "/api/models" }]);
  });

  test("updates an existing model (PUT with id in URL)", async () => {
    const { service, calls } = makeService();
    const { isNew } = await service.save(new Model(5));
    expect(isNew).toBe(false);
    expect(calls).toEqual([{ method: "PUT", url: "/api/models/5" }]);
  });
});

describe("EntityServiceBase.insert payload key", () => {
  function makeGuidService() {
    const calls = [];
    const axios = {
      post: async (url, body) => (calls.push({ url, body: { ...body } }), { data: { item: { ...body, id: "7f3c-real-guid" } } }),
      put: async (url, body) => (calls.push({ url, body: { ...body } }), { data: { item: body } }),
      get: async () => ({ data: { item: null } }),
      delete: async () => ({ data: {} }),
    };
    return { service: new GuidService(axios, { key: "test", api: "/api/models" }), calls };
  }

  test("omits an unsaved string key so the server can mint one", async () => {
    const { service, calls } = makeGuidService();

    await service.save(new GuidModel(""));

    expect("id" in calls[0].body).toBe(false);
    expect(calls[0].body.name).toBe("x");
  });

  test("omits an unsaved int key too (0 means unsaved)", async () => {
    const bodies = [];
    const axios = {
      post: async (url, body) => (bodies.push({ ...body }), { data: { item: { ...body, id: 42 } } }),
      get: async () => ({ data: { item: null } }),
    };
    const service = new TestService(axios, { key: "test", api: "/api/models" });

    await service.save(new Model(0));

    expect("id" in bodies[0]).toBe(false);
  });

  test("keeps a real key on the payload", async () => {
    const { service, calls } = makeGuidService();

    await service.insert(new GuidModel("already-minted"));

    expect(calls[0].body.id).toBe("already-minted");
  });

  test("leaves the model's own id intact — the payload is a copy", async () => {
    const { service } = makeGuidService();
    const item = new GuidModel("");

    await service.insert(item);

    // insert() assigns the server-minted key; what matters is that dropping it from the payload never
    // deleted the property off the caller's model (a failed POST would otherwise leave it undefined).
    expect(item.id).toBe("7f3c-real-guid");
  });
});
