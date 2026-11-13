const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const ts = require("typescript");
function setup(host = "shop.test") {
  const data = new Map(),
    scripts = [];
  const context = {
    exports: {},
    location: {
      hostname: host,
      origin: "https://" + host,
      pathname: "/urun/x",
    },
    localStorage: {
      getItem: (k) => data.get(k) || null,
      setItem: (k, v) => data.set(k, v),
    },
    document: {
      cookie: "",
      createElement: () => ({}),
      head: { appendChild: (s) => scripts.push(s) },
    },
    window: {},
    Date,
    JSON,
  };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync("lib/marketing.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return { m: context.exports, context, scripts, data };
}
const cfg = {
  enabled: true,
  measurement_id: "G-TEST",
  ads_id: "AW-123",
  conversion_label: "label",
};
test("no consent no third party script", () => {
  const s = setup();
  s.m.configureTracking(cfg);
  assert.equal(s.scripts.length, 0);
});
test("localhost never transmits", () => {
  const s = setup("localhost");
  s.m.saveConsent(true, true);
  s.m.configureTracking(cfg);
  assert.equal(s.scripts.length, 0);
});
test("consent gates providers and deduplicates page views", () => {
  const s = setup();
  s.m.saveConsent(true, false);
  s.m.configureTracking(cfg);
  assert.equal(s.scripts.length, 1);
  const calls = s.context.window.dataLayer.map((x) => Array.from(x));
  assert(calls.some((x) => x[0] === "config" && x[1] === "G-TEST"));
  assert(!calls.some((x) => x[0] === "config" && x[1] === "AW-123"));
  s.m.trackPage("/");
  s.m.trackPage("/");
  s.m.trackPage("/hesabim");
  assert.equal(
    s.context.window.dataLayer.filter((x) => x[1] === "page_view").length,
    1,
  );
});
test("purchase requires paid state and deduplicates per provider", () => {
  const s = setup();
  s.m.saveConsent(true, true);
  s.m.configureTracking(cfg);
  const order = {
    id: "test-1",
    payment_status: "pending",
    total: 10,
    items: [],
  };
  s.m.trackPaidPurchase(order);
  assert.equal(s.data.size, 1);
  order.payment_status = "paid";
  s.m.trackPaidPurchase(order);
  s.m.trackPaidPurchase(order);
  assert.equal(
    s.context.window.dataLayer.filter((x) => x[1] === "purchase").length,
    1,
  );
  assert.equal(
    s.context.window.dataLayer.filter((x) => x[1] === "conversion").length,
    1,
  );
});
