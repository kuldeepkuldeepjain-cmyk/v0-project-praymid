const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const { test } = require("node:test")
const { runInNewContext } = require("node:vm")
const ts = require("typescript")

const source = readFileSync(resolve(__dirname, "../lib/upi-payment.ts"), "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exportsObject = {}
runInNewContext(compiled, { exports: exportsObject, URLSearchParams })
const { buildUpiPaymentUri } = exportsObject

test("UPI payment carries the exact payee, INR amount and currency", () => {
  const uri = new URL(buildUpiPaymentUri(" elitefun@slc ", "Elite Fund", 50 * 104))
  assert.equal(uri.protocol, "upi:")
  assert.equal(uri.host, "pay")
  assert.equal(uri.searchParams.get("pa"), "elitefun@slc")
  assert.equal(uri.searchParams.get("pn"), "Elite Fund")
  assert.equal(uri.searchParams.get("am"), "5200.00")
  assert.equal(uri.searchParams.get("cu"), "INR")
})

test("promo-adjusted amounts are rounded to two decimal places", () => {
  const uri = new URL(buildUpiPaymentUri("merchant@bank", null, 45.25 * 104.3))
  assert.equal(uri.searchParams.get("am"), "4719.57")
  assert.equal(uri.searchParams.get("pn"), "EliteFund")
})

test("payee names cannot inject payment parameters", () => {
  const uri = new URL(buildUpiPaymentUri("merchant@bank", "Name &pa=attacker@bank", 100))
  assert.equal(uri.searchParams.get("pn"), "Name &pa=attacker@bank")
  assert.deepEqual(uri.searchParams.getAll("pa"), ["merchant@bank"])
})

test("missing and malformed UPI IDs never generate payment links", () => {
  for (const id of [null, "", " ", "bad id@bank", "merchant", "merchant@bank&am=1", "javascript:alert(1)"]) {
    assert.equal(buildUpiPaymentUri(id, "EliteFund", 100), null)
  }
})

test("invalid or zero-rounded amounts never generate payment links", () => {
  for (const amount of [0, -1, NaN, Infinity, 0.001, 1_000_000_001]) {
    assert.equal(buildUpiPaymentUri("merchant@bank", "EliteFund", amount), null)
  }
})
