const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

test("catalog text round trips inside HTML-safe JSON-LD", () => {
  const context = { exports: {} };
  const source = readFileSync("lib/json-ld.ts", "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  const product = { name: "Çocuk < Bakım", description: "</script> & günlük bakım" };
  const json = context.exports.serializeJsonLd(product);
  assert.ok(!json.includes("<"));
  assert.deepEqual(JSON.parse(json), product);
});
