// ============================================================
// V9 密码学原语测试（V9-C-003）：KDF 确定性 / AES-GCM / 校验器 / DEK 包裹
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  KDF_ITERATIONS,
  KDF_ITERATIONS_MIN,
  SALT_BYTES,
  IV_BYTES,
  TAG_BYTES,
  randomBytes,
  toB64,
  fromB64,
  bytesEqual,
  deriveKEKBits,
  computeVerifier,
  importAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  wrapDEK,
  unwrapDEK,
  sha256HexAsync,
  FILE_AAD_PREFIX,
  fileAad,
} from './crypto'

const te = new TextEncoder()

describe('crypto 原语', () => {
  it('随机数长度符合契约（salt 128-bit / IV 96-bit）', () => {
    expect(randomBytes(SALT_BYTES)).toHaveLength(16)
    expect(randomBytes(IV_BYTES)).toHaveLength(12)
    const a = randomBytes(16)
    const b = randomBytes(16)
    expect(bytesEqual(a, b)).toBe(false)
  })

  it('PBKDF2 同盐同密码同迭代 → 同 KEK；不同密码/盐 → 不同', async () => {
    const salt = randomBytes(SALT_BYTES)
    const a = await deriveKEKBits('correct horse', salt, 1000)
    const b = await deriveKEKBits('correct horse', salt, 1000)
    const c = await deriveKEKBits('correct horsE', salt, 1000)
    const d = await deriveKEKBits('correct horse', randomBytes(SALT_BYTES), 1000)
    expect(bytesEqual(a, b)).toBe(true)
    expect(bytesEqual(a, c)).toBe(false)
    expect(bytesEqual(a, d)).toBe(false)
    expect(a).toHaveLength(32)
  })

  it('迭代次数配置合规（≥ 210k 下限，kdfParamsVersion=1）', () => {
    expect(KDF_ITERATIONS).toBeGreaterThanOrEqual(KDF_ITERATIONS_MIN)
  })

  it('校验器确定性 + 密码敏感性', async () => {
    const bits = await deriveKEKBits('pw', randomBytes(SALT_BYTES), 1000)
    const v1 = await computeVerifier(bits)
    const v2 = await computeVerifier(bits)
    expect(v1).toBe(v2)
    const other = await deriveKEKBits('pw2', randomBytes(SALT_BYTES), 1000)
    expect(await computeVerifier(other)).not.toBe(v1)
  })

  it('AES-256-GCM 往返 + 篡改失败', async () => {
    const bits = await deriveKEKBits('pw', randomBytes(SALT_BYTES), 1000)
    const key = await importAesKey(bits)
    const plain = te.encode('秘密内容 🔒')
    const env = await aesGcmEncrypt(key, plain, te.encode('aad-name'))
    expect(fromB64(env.iv)).toHaveLength(IV_BYTES)
    expect(fromB64(env.tag)).toHaveLength(TAG_BYTES)

    const back = await aesGcmDecrypt(key, env, te.encode('aad-name'))
    expect(new TextDecoder().decode(back)).toBe('秘密内容 🔒')

    // 篡改密文 → 校验失败
    const tampered = { ...env, ct: toB64(fromB64(env.ct).map((b, i) => (i === 0 ? b ^ 0xff : b))) }
    await expect(aesGcmDecrypt(key, tampered, te.encode('aad-name'))).rejects.toThrow()

    // AAD 不符 → 失败
    await expect(aesGcmDecrypt(key, env, te.encode('other'))).rejects.toThrow()

    // 错误密钥 → 失败
    const wrong = await importAesKey(await deriveKEKBits('wrong', randomBytes(SALT_BYTES), 1000))
    await expect(aesGcmDecrypt(wrong, env, te.encode('aad-name'))).rejects.toThrow()
  })

  it('DEK 包裹/解包往返', async () => {
    const kekBits = await deriveKEKBits('pw', randomBytes(SALT_BYTES), 1000)
    const { dek, env } = await wrapDEK(kekBits)
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dek))
    expect(raw).toHaveLength(32)

    const unwrapped = await unwrapDEK(kekBits, env)
    const raw2 = new Uint8Array(await crypto.subtle.exportKey('raw', unwrapped))
    expect(bytesEqual(raw, raw2)).toBe(true)

    // 错误 KEK 解包失败
    const wrongBits = await deriveKEKBits('wrong', randomBytes(SALT_BYTES), 1000)
    await expect(unwrapDEK(wrongBits, env)).rejects.toThrow()
  })

  it('SHA-256 摘要正确（快照校验用）', async () => {
    const hex = await sha256HexAsync('abc')
    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('文件 AAD = v9-file:{immutableFileId}（Patch C-003-05）', () => {
    expect(FILE_AAD_PREFIX).toBe('v9-file:')
    const aad = fileAad('abc123')
    expect(new TextDecoder().decode(aad)).toBe('v9-file:abc123')
    // 不同 fileId → 不同 AAD（复制到另一身份认证失败的基础）
    expect(bytesEqual(fileAad('abc123'), fileAad('def456'))).toBe(false)
  })
})
