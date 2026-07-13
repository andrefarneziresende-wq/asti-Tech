export const ADMIN_SESSION_COOKIE = "astitech_admin_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Senha padrão só vale em desenvolvimento. Em produção, defina ADMIN_PASSWORD
 * como variável de ambiente — sem ela, este fallback fica ativo e é inseguro.
 */
function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "astitech2026";
}

export async function getExpectedSessionToken(): Promise<string> {
  return sha256Hex(`astitech-admin-session:${getAdminPassword()}`);
}

export function isValidPassword(password: string): boolean {
  return password.length > 0 && password === getAdminPassword();
}
