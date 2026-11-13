const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
function worker() {
  const handlers = {},
    deleted = [],
    saved = [];
  let activated = 0;
  const offline = { offline: true };
  const context = {
    URL,
    Response,
    fetch: async () => {
      throw Error("offline");
    },
    caches: {
      open: async () => ({ add: async (r) => saved.push(r.url) }),
      keys: async () => ["iv-offline-v1", "other-app", "iv-offline-v3"],
      delete: async (k) => deleted.push(k),
      match: async () => offline,
    },
    self: {
      location: { origin: "https://shop.test" },
      clients: { claim: async () => {} },
      skipWaiting: () => activated++,
      addEventListener: (name, fn) => (handlers[name] = fn),
    },
  };
  context.Request = class {
    constructor(url) {
      this.url = url;
    }
  };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), context);
  return {
    handlers,
    deleted,
    saved,
    offline,
    get activated() {
      return activated;
    },
  };
}
test("only offline document is precached; foreign caches preserved", async () => {
  const w = worker();
  let pending;
  w.handlers.install({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.deepEqual(w.saved, ["/offline.html"]);
  w.handlers.activate({ waitUntil: (p) => (pending = p) });
  await pending;
  assert.deepEqual(w.deleted, ["iv-offline-v1"]);
});
test("offline navigation generic fallback; API POST assets RSC untouched", async () => {
  const w = worker();
  for (const path of [
    "/",
    "/urun/item",
    "/hesabim",
    "/sepet",
    "/odeme",
    "/yonetim",
  ]) {
    let p;
    w.handlers.fetch({
      request: {
        url: "https://shop.test" + path,
        method: "GET",
        mode: "navigate",
      },
      respondWith: (x) => (p = x),
    });
    assert.equal(await p, w.offline);
  }
  for (const req of [
    { url: "https://shop.test/api/v1/cart", method: "GET", mode: "cors" },
    { url: "https://shop.test/urun/x?_rsc=1", method: "GET", mode: "cors" },
    { url: "https://shop.test/order", method: "POST", mode: "navigate" },
    { url: "https://other.test/", method: "GET", mode: "navigate" },
  ]) {
    w.handlers.fetch({
      request: req,
      respondWith: () => assert.fail("intercepted sensitive request"),
    });
  }
});
test("updates wait for explicit message", () => {
  const w = worker();
  assert.equal(w.activated, 0);
  w.handlers.message({ data: { type: "OTHER" } });
  assert.equal(w.activated, 0);
  w.handlers.message({ data: { type: "ACTIVATE_UPDATE" } });
  assert.equal(w.activated, 1);
});
test("manifest installable and maskable icons", () => {
  const m = JSON.parse(fs.readFileSync("public/manifest.json"));
  assert.equal(m.scope, "/");
  assert.equal(m.display, "standalone");
  for (const n of [192, 512])
    assert(
      m.icons.some(
        (i) => i.sizes === `${n}x${n}` && fs.existsSync("public" + i.src),
      ),
    );
  assert(m.icons.some((i) => i.purpose === "maskable"));
});
