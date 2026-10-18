// ============================================================
// Vault 跨平台迁移 — exportVaultData / importVaultData 往返与安全边界
// 背景：密码本条目由「主密码 + 主盐」派生密钥加密（VaultPage deriveKey），
// 迁移必须连同 vaultMasterHash / vaultMasterSalt 设置行一起携带，
// 否则新机器设置新主密码后将无法解密旧条目（Patch：Vault 迁移）。
// ============================================================

import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'

const NOW = '2026-08-30T00:00:00.000Z'

async function seedVaultRow(id = 'v1'): Promise<void> {
  await db.vault.add({
    id,
    platform: 'p',
    username: 'u',
    password: 'SECRET',
    passwordIv: 'iv',
    url: '',
    note: '',
    lastUsed: '',
  } as never)
}

describe('Vault 跨平台迁移', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('导出携带主密码校验设置（仅 vaultMasterHash/Salt），导入后原样可解锁', async () => {
    await db.settings.put({ key: 'vaultMasterHash', value: 'hash' })
    await db.settings.put({ key: 'vaultMasterSalt', value: 'salt' })
    await db.settings.put({ key: 'otherSetting', value: 'keep-out' })
    await seedVaultRow()

    const exported = await db.exportVaultData()
    expect(exported.vault).toHaveLength(1)
    // 只带密码本主密码设置，不带无关设置
    expect(exported.settings).toHaveLength(2)
    expect(exported.settings.map((s: any) => s.key).sort()).toEqual([
      'vaultMasterHash',
      'vaultMasterSalt',
    ])

    // 模拟新机器：清空 vault 与主密码设置后导入
    await db.vault.clear()
    await db.settings.delete('vaultMasterHash')
    await db.settings.delete('vaultMasterSalt')
    await db.importVaultData(exported)

    expect(await db.vault.count()).toBe(1)
    expect((await db.settings.get('vaultMasterHash'))?.value).toBe('hash')
    expect((await db.settings.get('vaultMasterSalt'))?.value).toBe('salt')
  })

  it('缺失 vault 表时拒绝导入，且不破坏现有数据', async () => {
    await seedVaultRow()
    await expect(db.importVaultData({})).rejects.toThrow('缺少 vault 表')
    expect(await db.vault.count()).toBe(1)
  })

  it('settings 缺失/含无关行时只导入 vaultMaster 两行（防御脏数据）', async () => {
    await seedVaultRow('v9')
    const exported = await db.exportVaultData()
    const dirty = {
      vault: exported.vault,
      settings: [
        { key: 'vaultMasterHash', value: 'h' },
        { key: 'vaultMasterSalt', value: 's' },
        { key: 'malicious', value: 'x' },
      ],
    }
    await db.vault.clear()
    await db.importVaultData(dirty)
    expect(await db.vault.count()).toBe(1)
    expect(await db.settings.get('malicious')).toBeUndefined()
    expect((await db.settings.get('vaultMasterHash'))?.value).toBe('h')
  })
})
