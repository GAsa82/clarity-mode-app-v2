// ─── Breakthrough Protocol Vault — Sister Platform Configuration ──────────────
// Set VAULT_URL to your Breakthrough Protocol Vault domain.
// Every vault link across the entire site reads from this single value.
// No other file needs to change when the domain changes.
// ─────────────────────────────────────────────────────────────────────────────
export const VAULT_URL = "https://YOUR-VAULT-DOMAIN.com";

export const VAULT_PATHS = {
  home: VAULT_URL,
  login: `${VAULT_URL}/login`,
} as const;

export type VaultPath = keyof typeof VAULT_PATHS;

// False until VAULT_URL is updated from the placeholder
export const VAULT_CONFIGURED = !VAULT_URL.includes("YOUR-VAULT-DOMAIN");
