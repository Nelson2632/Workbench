/** Credentials are transferred only by the explicit vault export/import path. */
export const VAULT_SETTING_KEYS = ['vaultMasterHash', 'vaultMasterSalt']
export function isVaultSetting(row: { key?: unknown }): boolean {
  return typeof row.key === 'string' && VAULT_SETTING_KEYS.includes(row.key)
}
