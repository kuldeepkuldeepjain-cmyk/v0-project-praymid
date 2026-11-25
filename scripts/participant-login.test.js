const assert = require("node:assert/strict")
const { readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const { test } = require("node:test")
const { runInNewContext } = require("node:vm")
const ts = require("typescript")
const { NextRequest, NextResponse } = require("next/server")

const nonce = "a".repeat(64)
const baseParticipant = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "participant@gmail.com",
  username: "participant",
  password_hash: "$2b$test-hash",
  pin_hash: "$2b$test-pin-hash",
  status: "active",
  is_active: true,
  otp_verified: true,
  is_deleted: false,
  is_frozen: false,
  account_frozen: false,
  funded_breach_status: "clear",
}
const routes = ["participant-login", "participant-pin-login", "participant-google-one-tap"]

function loadRoute(name, participant, options = {}) {
  const sessions = []
  const writes = []
  const googleUser = {
    sub: "google-subject", email: baseParticipant.email, email_verified: true, nonce,
    ...options.googleUser,
  }
  const modules = {
    "next/server": { NextRequest, NextResponse },
    "node:crypto": require("node:crypto"),
    bcryptjs: { compare: async () => options.validCredential !== false },
    "@/lib/db": {
      query: async () => participant ? [participant] : [],
      queryOne: async () => participant,
      execute: async (...args) => { writes.push(args) },
    },
    "@/lib/session": { startParticipantLogin: async (value) => { sessions.push(value) } },
    "@/lib/security": {
      getSecurityContext: () => ({ ipAddress: "127.0.0.1", deviceHash: "test-device" }),
      enforceRateLimit: async () => ({ allowed: !options.rateLimited, retryAfter: 60 }),
      getActiveRestriction: async () => options.restricted ? { restrictionType: "login" } : null,
      recordSecurityEvent: async () => {},
      updateParticipantSecurityProfile: async () => ({ duplicateAccountCount: 0 }),
    },
    "google-auth-library": {
      OAuth2Client: class {
        async verifyIdToken() {
          if (options.validCredential === false) throw new Error("Invalid token")
          return { getPayload: () => googleUser }
        }
      },
    },
    "@/lib/google-registration": {
      createGoogleParticipant: async () => { throw new Error("Login must not register participants") },
      googleRegistrationSchema: {},
    },
  }
  const source = readFileSync(resolve(__dirname, `../app/api/auth/${name}/route.ts`), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const exportsObject = {}
  runInNewContext(compiled, {
    exports: exportsObject,
    require: (id) => {
      assert.ok(id in modules, `Unexpected dependency: ${id}`)
      return modules[id]
    },
    process: { env: { NEXT_PUBLIC_GOOGLE_CLIENT_ID: "test-client-id", NODE_ENV: "test" } },
    console,
  })
  const request = new NextRequest(`http://localhost/api/auth/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `google_login_nonce=${nonce}` },
    body: JSON.stringify({ email: baseParticipant.email, password: "test-password", pin: "123456", credential: "test-google-token", intent: "login" }),
  })
  return { invoke: () => exportsObject.POST(request), sessions, writes }
}

for (const route of routes) {
  for (const [label, fields] of [
    ["active", {}],
    ["funded breach with legacy freeze flags", { account_type: "funded", funded_breach_status: "breached", is_frozen: true, account_frozen: true, status: "frozen", is_active: false }],
    ["failed challenge", { account_type: "challenge", challenge_status: "failed", is_frozen: true, account_frozen: true, status: "breached" }],
    ["frozen", { is_frozen: true, account_frozen: true, status: "frozen" }],
    ["inactive", { is_active: false, status: "inactive" }],
    ["pending verification", { otp_verified: false, is_active: false, status: "pending" }],
    ["blocked status", { status: "blocked" }],
    ["suspended status", { status: "suspended" }],
  ]) {
    test(`${route}: ${label} participants can authenticate without changing account state`, async () => {
      const participant = { ...baseParticipant, ...fields }
      const before = { ...participant }
      const { invoke, sessions, writes } = loadRoute(route, participant)
      const response = await invoke()
      const data = await response.json()
      assert.equal(response.status, 200)
      assert.equal(data.success, true)
      assert.equal(data.status, participant.status)
      assert.equal(data.is_active, participant.is_active)
      assert.equal(data.funded_breach_status, participant.funded_breach_status)
      assert.equal(sessions.length, 1)
      assert.equal(sessions[0], participant)
      assert.deepEqual(participant, before)
      assert.ok(writes.every(([sql]) => !/UPDATE\s+participants/i.test(sql)))
    })
  }

  for (const [label, participant, options, status] of [
    ["invalid credentials", baseParticipant, { validCredential: false }, 401],
    ["unknown account", null, {}, route === "participant-google-one-tap" ? 404 : 401],
    ["deleted account", { ...baseParticipant, is_deleted: true }, {}, 403],
    ["security review", baseParticipant, { restricted: true }, 403],
    ["rate limit", baseParticipant, { rateLimited: true }, 429],
  ]) {
    test(`${route}: ${label} does not create a session`, async () => {
      const { invoke, sessions } = loadRoute(route, participant, options)
      const response = await invoke()
      assert.equal(response.status, status)
      assert.equal((await response.json()).success, false)
      assert.equal(sessions.length, 0)
    })
  }
}

for (const [label, googleUser] of [
  ["unverified Google email", { email_verified: false }],
  ["mismatched nonce", { nonce: "b".repeat(64) }],
]) {
  test(`Google login still rejects ${label}`, async () => {
    const { invoke, sessions } = loadRoute("participant-google-one-tap", baseParticipant, { googleUser })
    const response = await invoke()
    assert.equal(response.status, 401)
    assert.equal(sessions.length, 0)
  })
}
