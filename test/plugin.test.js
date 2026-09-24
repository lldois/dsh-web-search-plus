import test from "node:test";
import assert from "node:assert/strict";
import { name, inject, apply, SETTINGS_NAMESPACE } from "../lib/index.js";

test("plugin metadata and registration", () => {
  assert.equal(name, "web-search-plus");
  assert.deepEqual(inject, ["web"]);
  assert.equal(SETTINGS_NAMESPACE, "web-search-plus");

  let registeredProvider = null;
  const mockCtx = {
    web: {
      registerSearchProvider: (provider) => {
        registeredProvider = provider;
      },
    },
    inject: () => {},
  };

  apply(mockCtx, { apiKey: "test-key" });
  assert.ok(registeredProvider, "Provider should be registered");
  assert.equal(registeredProvider.id, "web-search-plus");
  assert.equal(registeredProvider.available(), true);
});
