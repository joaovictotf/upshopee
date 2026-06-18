// Per-user banking details, stored locally in the browser.
// Visual/profile data only — no real financial transaction ever uses this.

export type BankInfo = {
  nomeCompleto: string;
  documento: string; // CPF ou CNPJ
  chavePix: string;
  banco: string;
  agencia: string;
  conta: string;
};

export const BANK_INFO_KEY = (email: string) =>
  `shopesync.bankinfo.${email.trim().toLowerCase()}`;

export function loadBankInfo(email: string | null | undefined): BankInfo | null {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(BANK_INFO_KEY(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BankInfo>;
    if (!isValidBankInfo(parsed)) return null;
    return {
      nomeCompleto: String(parsed.nomeCompleto ?? ""),
      documento: String(parsed.documento ?? ""),
      chavePix: String(parsed.chavePix ?? ""),
      banco: String(parsed.banco ?? ""),
      agencia: String(parsed.agencia ?? ""),
      conta: String(parsed.conta ?? ""),
    };
  } catch {
    return null;
  }
}

export function saveBankInfo(email: string, info: BankInfo): void {
  try {
    localStorage.setItem(BANK_INFO_KEY(email), JSON.stringify(info));
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

export function hasBankInfo(email: string | null | undefined): boolean {
  return loadBankInfo(email) !== null;
}

// Lightweight digit-count validation for CPF (11) or CNPJ (14).
export function isValidDocumento(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

export type BankInfoErrors = Partial<Record<keyof BankInfo, string>>;

export function validateBankInfo(info: Partial<BankInfo>): BankInfoErrors {
  const errors: BankInfoErrors = {};
  const req = (v: unknown) => !String(v ?? "").trim();

  if (req(info.nomeCompleto)) errors.nomeCompleto = "Informe seu nome completo.";
  if (req(info.documento)) errors.documento = "Informe seu CPF ou CNPJ.";
  else if (!isValidDocumento(String(info.documento)))
    errors.documento = "CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.";
  if (req(info.chavePix)) errors.chavePix = "Informe sua chave PIX.";
  if (req(info.banco)) errors.banco = "Informe o banco.";
  if (req(info.agencia)) errors.agencia = "Informe a agência.";
  if (req(info.conta)) errors.conta = "Informe a conta.";

  return errors;
}

function isValidBankInfo(info: Partial<BankInfo>): boolean {
  return Object.keys(validateBankInfo(info)).length === 0;
}
