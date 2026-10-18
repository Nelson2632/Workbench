// ============================================================
// V9 Private Files 测试（V9-C-003 §3 + Patch C-003-05 / P-1 收口）
// 往返 / 篡改拒绝 / 改名不破坏 / AAD 绑定 fileId / SHA 校验 / 锁态
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db/database'
import { setupLock, _resetForTests } from '@/domain/security/appLock'
import { clearKEK } from '@/domain/security/crypto'
import {
  encryptPrivateFile,
  decryptPrivateFile,
  renamePrivateFile,
  deletePrivateFile,
  listPrivateFiles,
  privateFileStorage,
  _clearDevStorageForTests,
} from './privateFiles'

const te = new TextEncoder()

describe('Private Files', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
    _resetForTests()
    _clearDevStorageForTests()
    await setupLock('test-pw', 15, 1000)
  })

  it('M6 验证 1：加密 → 解密内容一致；密文与明文不同', async () => {
    const plain = te.encode('私密内容 🔒 123')
    const id = await encryptPrivateFile({ name: 'secret.txt', bytes: plain, mimeType: 'text/plain' })

    const metas = await listPrivateFiles()
    expect(metas).toHaveLength(1)
    expect(metas[0].name).toBe('secret.txt')
    expect(metas[0].size).toBe(plain.length)

    const stored = await privateFileStorage.load(metas[0].encPath)
    expect(stored).not.toBeNull()
    expect(new TextDecoder().decode(stored!.slice(0, 20))).not.toContain('私密')

    const dec = await decryptPrivateFile(id)
    expect(new TextDecoder().decode(dec.bytes)).toBe('私密内容 🔒 123')
    expect(dec.name).toBe('secret.txt')
  })

  it('篡改密文 → GCM 认证失败', async () => {
    const id = await encryptPrivateFile({ name: 'a.bin', bytes: te.encode('data') })
    const meta = (await db.privateFileMeta.get(id))!
    const stored = (await privateFileStorage.load(meta.encPath))!
    stored[0] ^= 0xff
    await privateFileStorage.save(meta.encPath, stored)
    await expect(decryptPrivateFile(id)).rejects.toThrow()
  })

  it('改名不破坏解密（展示名 ≠ 密码学身份，Patch C-003-05）', async () => {
    const id = await encryptPrivateFile({ name: '旧名.txt', bytes: te.encode('data') })
    await renamePrivateFile(id, '新名.txt')
    const dec = await decryptPrivateFile(id)
    expect(dec.name).toBe('新名.txt')
    expect(new TextDecoder().decode(dec.bytes)).toBe('data')
  })

  it('AAD 绑定 immutable fileId：密文复制到其他 id 的元数据下认证失败', async () => {
    const idA = await encryptPrivateFile({ name: 'A.txt', bytes: te.encode('AAA') })
    const idB = await encryptPrivateFile({ name: 'B.txt', bytes: te.encode('BBB') })
    const metaA = (await db.privateFileMeta.get(idA))!
    const metaB = (await db.privateFileMeta.get(idB))!

    // 把 A 的密文复制到 B 的存储路径（B 的 DEK/元数据不变）
    const cipherA = (await privateFileStorage.load(metaA.encPath))!
    await privateFileStorage.save(metaB.encPath, cipherA)

    await expect(decryptPrivateFile(idB)).rejects.toThrow() // AAD/DEK 不一致
    // A 自身仍可正常解密
    expect(new TextDecoder().decode((await decryptPrivateFile(idA)).bytes)).toBe('AAA')
  })

  it('SHA-256 完整性：明文摘要被改 → 报告损坏', async () => {
    const id = await encryptPrivateFile({ name: 'x', bytes: te.encode('data') })
    await db.privateFileMeta.update(id, { sha256Plain: '0'.repeat(64) })
    await expect(decryptPrivateFile(id)).rejects.toThrow('损坏')
  })

  it('未解锁（无 KEK）→ 加密/解密拒绝', async () => {
    const id = await encryptPrivateFile({ name: 'x', bytes: te.encode('data') })
    clearKEK()
    await expect(encryptPrivateFile({ name: 'y', bytes: te.encode('data') })).rejects.toThrow('未解锁')
    await expect(decryptPrivateFile(id)).rejects.toThrow('未解锁')
  })

  it('删除：元数据与密文一并移除', async () => {
    const id = await encryptPrivateFile({ name: 'x', bytes: te.encode('data') })
    const meta = (await db.privateFileMeta.get(id))!
    await deletePrivateFile(id)
    expect(await db.privateFileMeta.count()).toBe(0)
    expect(await privateFileStorage.load(meta.encPath)).toBeNull()
  })
})
