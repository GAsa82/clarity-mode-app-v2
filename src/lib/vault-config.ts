// ─── Breakthrough Protocol Vault — Sister Platform Configuration ──────────────
// Set VAULT_URL to your Breakthrough Protocol Vault domain.
// Every vault link across the entire site reads from this single value.
// No other file needs to change when the domain changes.
// ─────────────────────────────────────────────────────────────────────────────
export const VAULT_URL = "https://breakthrough-protocol.vercel.app";

export const VAULT_PATHS = {
  home: `${VAULT_URL}/vault`,
  login: `${VAULT_URL}/login`,
} as const;

export type VaultPath = keyof typeof VAULT_PATHS;

export const VAULT_CONFIGURED = !VAULT_URL.includes("YOUR-VAULT-DOMAIN");
