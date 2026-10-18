// ============================================================
// V9 SECURITY — Private Files（V9-C-003 §3 + Patch C-003-05）
// 主密码 → KEK → 随机 DEK（每文件独立）→ AES-256-GCM 密文
// AAD = 'v9-file:' + immutableFileId（P-1 收口：= privateFileMeta.id）
// 展示名 name ≠ 密码学身份；密文进 Tauri 私有目录 PrivateWorkbench/files/
// ============================================================

import { db } from '@/db/database'
import {
  getKEKBits,
  wrapDEK,
  unwrapDEK,
  fileAad,
  importAesKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  sha256HexAsync,
  toB64,
  fromB64,
  TAG_BYTES,
} from './crypto'
import type { PrivateFileMeta } from '@/types'

// ---------- 密文存储适配器（Tauri 私有目录 / 开发回退） ----------

type ByteStorage = {
  save: (relPath: string, bytes: Uint8Array) => Promise<void>
  load: (relPath: string) => Promise<Uint8Array | null>
  remove: (relPath: string) => Promise<void>
}

/** 开发回退：内存 Map（浏览器 dev 环境；Tauri 环境走 invoke） */
const devFallback = new Map<string, Uint8Array>()

function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export const privateFileStorage: ByteStorage = {
  async save(relPath, bytes) {
    if (inTauri()) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('v9_save_private_file', { relPath, data: Array.from(bytes) })
      return
    }
    devFallback.set(relPath, bytes.slice())
  },
  async load(relPath) {
    if (inTauri()) {
      const { invoke } = await import('@tauri-apps/api/core')
      const data = (await invoke<number[] | null>('v9_load_private_file', { relPath })) ?? null
      return data ? new Uint8Array(data) : null
    }
    return devFallback.get(relPath)?.slice() ?? null
  },
  async remove(relPath) {
    if (inTauri()) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('v9_delete_private_file', { relPath })
      return
    }
    devFallback.delete(relPath)
  },
}

/** 测试辅助：清空开发回退存储 */
export function _clearDevStorageForTests(): void {
  devFallback.clear()
}

// ---------- 核心 API ----------

function concatCtTag(ctB64: string, tagB64: string): string {
  const ct = fromB64(ctB64)
  const tag = fromB64(tagB64)
  const out = new Uint8Array(ct.length + tag.length)
  out.set(ct, 0)
  out.set(tag, ct.length)
  return toB64(out)
}

function splitCtTag(joinedB64: string): { ct: string; tag: string } {
  const all = fromB64(joinedB64)
  const ct = toB64(all.slice(0, all.length - TAG_BYTES))
  const tag = toB64(all.slice(all.length - TAG_BYTES))
  return { ct, tag }
}

export interface EncryptInput {
  name: string
  bytes: Uint8Array
  mimeType?: string | null
}

/**
 * 加密私密文件（需 App Lock 已解锁，KEK 在内存）。
 * 流程：随机 DEK → KEK 包裹 → 先落元数据（拿到不可变 id）→
 * 以 fileAad(id) 加密明文 → 回写 fileIv/fileTag → 密文入私有目录。
 */
export async function encryptPrivateFile(input: EncryptInput): Promise<number> {
  const kekBits = getKEKBits()
  if (!kekBits) throw new Error('App Lock 未解锁，无法加密私密文件')

  const now = new Date().toISOString()
  const sha = await sha256HexAsync(toB64(input.bytes))
  const { dek, env } = await wrapDEK(kekBits)
  const encPath = `${crypto.randomUUID()}.enc`

  // 先落元数据占位（获得不可变 id = 密码学身份，P-1 收口）
  const row: Omit<PrivateFileMeta, 'id'> = {
    name: input.name,
    size: input.bytes.length,
    mimeType: input.mimeType ?? null,
    sha256Plain: sha,
    encPath,
    dekIv: env.iv,
    dekCt: concatCtTag(env.ct, env.tag),
    fileIv: '',
    fileTag: '',
    createdAt: now,
    updatedAt: now,
  }
  const id = await db.privateFileMeta.add(row)

  const fileEnv = await aesGcmEncrypt(dek, input.bytes, fileAad(String(id)))
  const ctBytes = fromB64(fileEnv.ct)
  const tagBytes = fromB64(fileEnv.tag)
  const ciphertext = new Uint8Array(ctBytes.length + tagBytes.length)
  ciphertext.set(ctBytes, 0)
  ciphertext.set(tagBytes, ctBytes.length)

  await db.privateFileMeta.update(id, {
    fileIv: fileEnv.iv,
    fileTag: fileEnv.tag,
    updatedAt: new Date().toISOString(),
  })
  await privateFileStorage.save(encPath, ciphertext)
  return id
}

export interface DecryptedFile {
  id: number
  name: string
  mimeType: string | null
  bytes: Uint8Array
}

/** 解密私密文件（需解锁）；验 GCM 标签 + 明文 SHA-256，损坏即抛错 */
export async function decryptPrivateFile(id: number): Promise<DecryptedFile> {
  const kekBits = getKEKBits()
  if (!kekBits) throw new Error('App Lock 未解锁，无法解密私密文件')

  const meta = await db.privateFileMeta.get(id)
  if (!meta) throw new Error('私密文件元数据不存在')

  const raw = await privateFileStorage.load(meta.encPath)
  if (!raw) throw new Error('私密文件密文不存在')

  const { ct: dekCt, tag: dekTag } = splitCtTag(meta.dekCt)
  const dek = await unwrapDEK(kekBits, { iv: meta.dekIv, ct: dekCt, tag: dekTag })

  const fileCt = raw.slice(0, raw.length - TAG_BYTES)
  const fileTag = raw.slice(raw.length - TAG_BYTES)
  const plain = await aesGcmDecrypt(
    dek,
    { iv: meta.fileIv, ct: toB64(fileCt), tag: toB64(fileTag) },
    fileAad(String(id)),
  )

  const sha = await sha256HexAsync(toB64(plain))
  if (sha !== meta.sha256Plain) {
    throw new Error('私密文件损坏（SHA-256 不匹配）')
  }
  return { id, name: meta.name, mimeType: meta.mimeType, bytes: plain }
}

/** 改名/改显示名：只动 name，密码学身份（id）不变，无需重加密（Patch C-003-05） */
export async function renamePrivateFile(id: number, newName: string): Promise<void> {
  await db.privateFileMeta.update(id, { name: newName, updatedAt: new Date().toISOString() })
}

/** 删除：元数据 + 密文一并移除 */
export async function deletePrivateFile(id: number): Promise<void> {
  const meta = await db.privateFileMeta.get(id)
  if (!meta) return
  await privateFileStorage.remove(meta.encPath)
  await db.privateFileMeta.delete(id)
}

/** 列表（仅元数据，不含密文） */
export async function listPrivateFiles(): Promise<PrivateFileMeta[]> {
  return db.privateFileMeta.orderBy('createdAt').reverse().toArray()
}

/** 供测试注入 KEK 导入（无锁态时的辅助） */
export async function _hasKekForTests(): Promise<boolean> {
  return getKEKBits() !== null
}

export async function _importKekForTests(): Promise<CryptoKey | null> {
  const bits = getKEKBits()
  return bits ? importAesKey(bits) : null
}
