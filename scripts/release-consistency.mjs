import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'
const pkg = JSON.parse(readFileSync('workbench-v8/package.json', 'utf8'))
const lock = JSON.parse(readFileSync('workbench-v8/package-lock.json', 'utf8'))
const tauri = JSON.parse(readFileSync('workbench-v8/src-tauri/tauri.conf.json', 'utf8'))
const cargo = readFileSync('workbench-v8/src-tauri/Cargo.toml', 'utf8').match(/^version = "([^"]+)"/m)?.[1]
assert.equal(pkg.version, tauri.version)
assert.equal(pkg.version, cargo)
assert.equal(pkg.version, lock.packages[''].version)
assert(!existsSync('workbench-v8/pnpm-lock.yaml'))
assert(tauri.app.security.csp.includes("script-src 'self'"))
assert(!/script-src[^;]*unsafe-(?:eval|inline)/.test(tauri.app.security.csp))
assert(tauri.app.security.csp.includes('ipc:'))
console.log(`PASS: metadata ${pkg.version}, single npm lockfile, explicit CSP`)
