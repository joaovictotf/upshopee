import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import { type BankInfo, type BankInfoErrors, loadBankInfo, saveBankInfo, validateBankInfo } from "../lib/bankinfo";

export const Route = createFileRoute("/dashboard/configuracoes")({ component: Config });

function Config() {
  const { user, isAdmin } = useApp();
  const [storeName, setStoreName] = useState("Minha Loja Shopee");
  const [meta, setMeta] = useState("10");
  const [margem, setMargem] = useState("30");
  const [taxa, setTaxa] = useState("18");
  const [cor, setCor] = useState("Laranja");
  const [notif, setNotif] = useState(true);
  const [pref, setPref] = useState("RioStock");

  const EMPTY_BANK: BankInfo = { nomeCompleto: "", documento: "", chavePix: "", banco: "", agencia: "", conta: "" };
  const [bank, setBank] = useState<BankInfo>(() => loadBankInfo(user?.email) ?? EMPTY_BANK);
  const [bankErrors, setBankErrors] = useState<BankInfoErrors>({});
  const setBankField = (key: keyof BankInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBank((b) => ({ ...b, [key]: e.target.value }));
  const handleSaveBank = () => {
    if (!user?.email) return;
    const trimmed: BankInfo = {
      nomeCompleto: bank.nomeCompleto.trim(), documento: bank.documento.trim(),
      chavePix: bank.chavePix.trim(), banco: bank.banco.trim(),
      agencia: bank.agencia.trim(), conta: bank.conta.trim(),
    };
    const v = validateBankInfo(trimmed);
    if (Object.keys(v).length > 0) { setBankErrors(v); toast.error("Verifique os dados bancários."); return; }
    setBankErrors({});
    saveBankInfo(user.email, trimmed);
    setBank(trimmed);
    toast.success("Dados bancários salvos.");
  };

  return (
    <DashboardShell title="Configurações" subtitle="Ajuste as preferências da sua operação.">
      <div className="page-enter grid gap-5 lg:grid-cols-2">
        {/* ═══ LOJA ═══ */}
        <SettingsCard title="Loja">
          <FormField label="Nome da loja">
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30" />
          </FormField>
          <FormField label="E-mail da conta">
            <Input value={user?.email || ""} disabled className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]" />
          </FormField>
          <FormField label="Meta diária de vendas">
            <Input type="number" value={meta} onChange={(e) => setMeta(e.target.value)} className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30" />
          </FormField>
        </SettingsCard>

        {/* ═══ DADOS BANCÁRIOS ═══ */}
        <SettingsCard title="Dados bancários para recebimento">
          <p className="text-xs text-[var(--muted)]">
            Usados para o recebimento das suas comissões. Ficam salvos apenas neste navegador.
          </p>
          <BankField label="Nome completo" value={bank.nomeCompleto} onChange={setBankField("nomeCompleto")} error={bankErrors.nomeCompleto} />
          <BankField label="CPF ou CNPJ" value={bank.documento} onChange={setBankField("documento")} error={bankErrors.documento} inputMode="numeric" />
          <BankField label="Chave PIX" value={bank.chavePix} onChange={setBankField("chavePix")} error={bankErrors.chavePix} />
          <BankField label="Banco" value={bank.banco} onChange={setBankField("banco")} error={bankErrors.banco} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BankField label="Agência" value={bank.agencia} onChange={setBankField("agencia")} error={bankErrors.agencia} inputMode="numeric" />
            <BankField label="Conta" value={bank.conta} onChange={setBankField("conta")} error={bankErrors.conta} />
          </div>
          <div className="pt-1">
            <Button
              variant="outline"
              className="btn-ghost h-10 text-sm"
              onClick={handleSaveBank}
            >
              Salvar dados bancários
            </Button>
          </div>
        </SettingsCard>

        {/* ═══ PREFERÊNCIAS COMERCIAIS ═══ */}
        <SettingsCard title="Preferências comerciais">
          <FormField label="Margem padrão de lucro (%)">
            <Input type="number" value={margem} onChange={(e) => setMargem(e.target.value)} className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30" />
          </FormField>
          <FormField label="Taxa estimada da Shopee (%)">
            <Input type="number" value={taxa} onChange={(e) => setTaxa(e.target.value)} className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30" />
          </FormField>
          <FormField label="Preferência de fornecedores">
            <Select value={pref} onValueChange={setPref}>
              <SelectTrigger className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RioStock">RioStock Distribuidora</SelectItem>
                <SelectItem value="SP">SP Prime Atacado</SelectItem>
                <SelectItem value="Auto">Automático (menor preço)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </SettingsCard>

        {/* ═══ APARÊNCIA E NOTIFICAÇÕES ═══ */}
        <SettingsCard title="Aparência e notificações">
          <FormField label="Cor de destaque">
            <Select value={cor} onValueChange={setCor}>
              <SelectTrigger className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laranja">Laranja</SelectItem>
                <SelectItem value="Vermelho">Vermelho</SelectItem>
                <SelectItem value="Azul">Azul</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-4">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Notificações</div>
              <div className="text-xs text-[var(--muted)]">Receba alertas de vendas e comissões.</div>
            </div>
            <Switch checked={notif} onCheckedChange={setNotif} />
          </div>
        </SettingsCard>

        {/* ═══ FINANCEIRO ═══ */}
        <SettingsCard title="Financeiro">
          <p className="text-xs text-[var(--muted)]">
            Solicite o saque das suas comissões. O pedido será enviado para análise da equipe UpShopee.
          </p>
          <div className="rounded-xl bg-[var(--accent-soft)] p-4 ring-1 ring-[var(--accent)]/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <Shield className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text)]">
                  O saque ficará disponível após 30 dias de conta ativa.
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Os valores exibidos podem não representar saldo real disponível para saque.
                </p>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* ═══ ADMINISTRAÇÃO ═══ */}
        {isAdmin && (
          <SettingsCard title="Administração">
            <div className="rounded-xl bg-[var(--accent-soft)] p-4 ring-1 ring-[var(--accent)]/20">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                <Zap className="h-4 w-4" /> Modo demonstração
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Botão de simulação ativo no canto inferior direito.
              </p>
            </div>
          </SettingsCard>
        )}

        {/* ═══ FOOTER BUTTON ═══ */}
        <div className="lg:col-span-2 flex justify-end pt-2">
          <Button
            className="btn-primary h-10 px-8 text-sm"
            onClick={() => toast.success("Configurações salvas.")}
          >
            Salvar alterações
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-premium space-y-3 p-5">
      <h3 className="text-sm font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-[var(--muted)]">{label}</Label>
      {children}
    </div>
  );
}

function BankField({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-[var(--muted)]">{label}</Label>
      <Input
        aria-invalid={!!error}
        className={`h-10 rounded-[12px] border bg-[var(--surface)] shadow-[var(--shadow-card)] ${error ? "border-red-400 focus-visible:ring-red-300" : "border-[var(--border)] focus-visible:ring-[var(--accent)]/30"}`}
        {...props}
      />
      {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
}
