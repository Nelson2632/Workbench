// ============================================================
// Personal Workbench V9 — 密码学原语（V9-C-003 冻结）
// PBKDF2-HMAC-SHA256 / AES-256-GCM / HMAC-SHA256 / KEK 仅存内存
// 铁律：主密码、KEK、DEK 明文绝不持久化
// ============================================================

const te = new TextEncoder()
const td = new TextDecoder()

/** kdfParamsVersion=1 暂定迭代次数（Phase 1 实测后按版本锁定，V9-C-003 §2） */
export const KDF_ITERATIONS = 600_000
/** 迭代次数下限（Gate 校验） */
export const KDF_ITERATIONS_MIN = 210_000
/** Salt 长度 128-bit */
export const SALT_BYTES = 16
/** AES-GCM IV 96-bit */
export const IV_BYTES = 12
/** AES-GCM 认证标签 128-bit */
export const TAG_BYTES = 16
/** KEK/DEK 256-bit */
export const KEY_BYTES = 32
/** App Lock 校验器 HMAC 消息 */
export const VERIFIER_MESSAGE = 'v9-applock-verifier'
/** DEK 包裹 AAD */
export const DEK_WRAP_AAD = 'v9-dek-wrap'
/** 文件加密 AAD 前缀（Patch C-003-05：绑定不可变 fileId，展示名≠密码学身份） */
export const FILE_AAD_PREFIX = 'v9-file:'
/** 文件 AAD = 'v9-file:' + immutableFileId（支持改名/移动分组而无需重加密） */
export function fileAad(fileId: string): Uint8Array {
  return te.encode(FILE_AAD_PREFIX + fileId)
}

// ---------- 基础编码 ----------

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  crypto.getRandomValues(out)
  return out
}

export function toB64(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

export function fromB64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// ---------- KDF ----------

/** PBKDF2-HMAC-SHA256 派生 32 字节 KEK 位（返回原始字节，仅内存） */
export async function deriveKEKBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    te.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    KEY_BYTES * 8,
  )
  return new Uint8Array(bits)
}

/** 由 KEK 位导入 AES-GCM 密钥 */
export function importAesKey(bits: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    bits as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
}

// ---------- 校验器（HMAC）----------

/** HMAC-SHA256(KEK, VERIFIER_MESSAGE) → base64（校验器，不含密钥本身） */
export async function computeVerifier(bits: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    bits as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, te.encode(VERIFIER_MESSAGE))
  return toB64(new Uint8Array(mac))
}

// ---------- AES-256-GCM ----------

export interface GcmEnvelope {
  iv: string // base64
  ct: string // base64（密文，不含 tag）
  tag: string // base64
}

/** AES-256-GCM 加密；返回 iv/ct/tag 分离的信封（V9-C-003 §3） */
export async function aesGcmEncrypt(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad?: Uint8Array,
): Promise<GcmEnvelope> {
  const iv = randomBytes(IV_BYTES)
  const buf = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: aad as BufferSource | undefined,
      tagLength: TAG_BYTES * 8,
    },
    key,
    plaintext as BufferSource,
  )
  const all = new Uint8Array(buf)
  const ct = all.slice(0, all.length - TAG_BYTES)
  const tag = all.slice(all.length - TAG_BYTES)
  return { iv: toB64(iv), ct: toB64(ct), tag: toB64(tag) }
}

/** AES-256-GCM 解密；tag 校验失败抛错 */
export async function aesGcmDecrypt(
  key: CryptoKey,
  env: GcmEnvelope,
  aad?: Uint8Array,
): Promise<Uint8Array> {
  const iv = fromB64(env.iv)
  const ct = fromB64(env.ct)
  const tag = fromB64(env.tag)
  const full = new Uint8Array(ct.length + tag.length)
  full.set(ct, 0)
  full.set(tag, ct.length)
  const buf = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      additionalData: aad as BufferSource | undefined,
      tagLength: TAG_BYTES * 8,
    },
    key,
    full as BufferSource,
  )
  return new Uint8Array(buf)
}

// ---------- DEK 包裹（每文件独立 DEK）----------

export function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_BYTES * 8 },
    true,
    ['encrypt', 'decrypt'],
  )
}

/** 用 KEK 包裹随机 DEK（AES-GCM，AAD=DEK_WRAP_AAD） */
export async function wrapDEK(kekBits: Uint8Array): Promise<{ dek: CryptoKey; env: GcmEnvelope }> {
  const kek = await importAesKey(kekBits)
  const dek = await generateDEK()
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', dek))
  const env = await aesGcmEncrypt(kek, raw, te.encode(DEK_WRAP_AAD))
  return { dek, env }
}

/** 用 KEK 解包 DEK（导入为可导出密钥，供改密时重包裹） */
export async function unwrapDEK(kekBits: Uint8Array, env: GcmEnvelope): Promise<CryptoKey> {
  const kek = await importAesKey(kekBits)
  const raw = await aesGcmDecrypt(kek, env, te.encode(DEK_WRAP_AAD))
  return crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  )
}

// ---------- KEK 内存持有（铁律：绝不持久化）----------

let currentKEKBits: Uint8Array | null = null

export function setKEKBits(bits: Uint8Array | null): void {
  if (currentKEKBits) currentKEKBits.fill(0) // 清零旧密钥
  currentKEKBits = bits
}

export function getKEKBits(): Uint8Array | null {
  return currentKEKBits
}

export function hasKEK(): boolean {
  return currentKEKBits !== null
}

export function clearKEK(): void {
  setKEKBits(null)
}

/** 明文摘要（供文件完整性校验，V9-C-003 §3） */
export async function sha256HexAsync(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', te.encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
