import { useState } from "react";
import { Landmark } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import {
  type BankInfo,
  type BankInfoErrors,
  saveBankInfo,
  validateBankInfo,
} from "../lib/bankinfo";

const EMPTY: BankInfo = {
  nomeCompleto: "",
  documento: "",
  chavePix: "",
  banco: "",
  agencia: "",
  conta: "",
};

/**
 * Blocking modal shown over the dashboard when the current user has no banking
 * details saved. Cannot be dismissed (no close button, no overlay-click, no ESC)
 * until all fields are filled and valid. On submit it persists to localStorage
 * and calls onComplete() so the dashboard unblocks. Renders no navigation, so it
 * cannot cause a redirect loop.
 */
export function BankInfoGate({
  email,
  onComplete,
}: {
  email: string;
  onComplete: () => void;
}) {
  const [form, setForm] = useState<BankInfo>(EMPTY);
  const [errors, setErrors] = useState<BankInfoErrors>({});

  const set = (key: keyof BankInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: BankInfo = {
      nomeCompleto: form.nomeCompleto.trim(),
      documento: form.documento.trim(),
      chavePix: form.chavePix.trim(),
      banco: form.banco.trim(),
      agencia: form.agencia.trim(),
      conta: form.conta.trim(),
    };
    const v = validateBankInfo(trimmed);
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    saveBankInfo(email, trimmed);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="h-1.5 w-full rounded-t-2xl bg-[#EE4D2D]" />
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Dados bancários para recebimento</h2>
              <p className="text-xs text-muted-foreground">
                Antes de usar a plataforma, preencha seus dados de recebimento. É rápido e você poderá editar depois em Configurações.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <FieldInput label="Nome completo" value={form.nomeCompleto} onChange={set("nomeCompleto")} error={errors.nomeCompleto} placeholder="Seu nome completo" autoFocus />
            <FieldInput label="CPF ou CNPJ" value={form.documento} onChange={set("documento")} error={errors.documento} placeholder="Somente números" inputMode="numeric" />
            <FieldInput label="Chave PIX" value={form.chavePix} onChange={set("chavePix")} error={errors.chavePix} placeholder="E-mail, telefone, CPF/CNPJ ou aleatória" />
            <FieldInput label="Banco" value={form.banco} onChange={set("banco")} error={errors.banco} placeholder="Ex.: Nubank, Itaú, Banco do Brasil" />
            <div className="grid grid-cols-2 gap-3">
              <FieldInput label="Agência" value={form.agencia} onChange={set("agencia")} error={errors.agencia} placeholder="0001" inputMode="numeric" />
              <FieldInput label="Conta" value={form.conta} onChange={set("conta")} error={errors.conta} placeholder="12345-6" />
            </div>
          </div>

          <Button type="submit" className="mt-5 w-full">Salvar e continuar</Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Seus dados ficam salvos apenas neste navegador.
          </p>
        </form>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input aria-invalid={!!error} className={error ? "border-destructive focus-visible:ring-destructive" : ""} {...props} />
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}
