const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const { test } = require("node:test")
const { runInNewContext } = require("node:vm")
const ts = require("typescript")

const source = readFileSync(resolve(__dirname, "../lib/account-breach.ts"), "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const exportsObject = {}
runInNewContext(compiled, { exports: exportsObject, Date })
const { getAccountBreach, isCurrentBreachPayment } = exportsObject
const breachTime = "2026-11-24T12:00:00.000Z"
const funded = { account_type: "funded", funded_breach_status: "breached", funded_breach_at: breachTime }
const challenge = { account_type: "challenge", challenge_status: "failed", challenge_failed_at: breachTime }

test("funded breaches explain why the trading balance is zero", () => {
  assert.match(getAccountBreach(funded).reason, /maximum drawdown/)
  assert.match(getAccountBreach(funded).reason, /\$0\.00/)
  assert.equal(getAccountBreach(funded).occurredAt, breachTime)
})

test("failed challenges remain breached while a replacement is pending or rejected", () => {
  for (const status of ["failed", "pending_payment", "payment_rejected"]) {
    const result = getAccountBreach({ ...challenge, challenge_status: status })
    assert.match(result.reason, /daily loss or maximum drawdown/)
    assert.equal(result.occurredAt, breachTime)
  }
})

test("first-time challenge payments are not treated as breaches", () => {
  for (const status of ["pending_payment", "payment_rejected", "active", "passed"]) {
    assert.equal(getAccountBreach({ account_type: "challenge", challenge_status: status }), null)
  }
})

test("unrelated historical flags do not breach a normal account", () => {
  assert.equal(getAccountBreach({ ...funded, account_type: "normal" }), null)
  assert.equal(getAccountBreach({ ...challenge, account_type: "normal" }), null)
  assert.equal(getAccountBreach(null), null)
  assert.equal(getAccountBreach(), null)
})

test("only payments at or after the current breach can recover an account", () => {
  for (const account of [funded, challenge]) {
    assert.equal(isCurrentBreachPayment(account, "2026-11-24T11:59:59.999Z"), false)
    assert.equal(isCurrentBreachPayment(account, breachTime), true)
    assert.equal(isCurrentBreachPayment(account, "2026-11-24T12:00:00.001Z"), true)
    assert.equal(isCurrentBreachPayment(account, new Date(breachTime)), true)
  }
})

test("missing or invalid payment timestamps cannot recover an account", () => {
  assert.equal(isCurrentBreachPayment(funded, null), false)
  assert.equal(isCurrentBreachPayment(funded, "not-a-date"), false)
  assert.equal(isCurrentBreachPayment({ ...funded, funded_breach_at: "not-a-date" }, breachTime), false)
})

test("a legacy breach without a timestamp can still be recovered", () => {
  assert.equal(isCurrentBreachPayment({ ...funded, funded_breach_at: null }, breachTime), true)
  assert.equal(isCurrentBreachPayment({ ...challenge, challenge_failed_at: null }, breachTime), true)
})

test("approved replacement states cannot reuse restart payments", () => {
  for (const account of [
    { account_type: "normal" },
    { account_type: "funded", funded_breach_status: "clear" },
    { account_type: "challenge", challenge_status: "active", challenge_failed_at: null },
  ]) {
    assert.equal(isCurrentBreachPayment(account, breachTime), false)
  }
})
