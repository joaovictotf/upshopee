import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { WithdrawalButton } from "../components/withdrawal/WithdrawalDialog";
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
      nomeCompleto: bank.nomeCompleto.trim(),
      documento: bank.documento.trim(),
      chavePix: bank.chavePix.trim(),
      banco: bank.banco.trim(),
      agencia: bank.agencia.trim(),
      conta: bank.conta.trim(),
    };
    const v = validateBankInfo(trimmed);
    if (Object.keys(v).length > 0) {
      setBankErrors(v);
      toast.error("Verifique os dados bancários.");
      return;
    }
    setBankErrors({});
    saveBankInfo(user.email, trimmed);
    setBank(trimmed);
    toast.success("Dados bancários salvos.");
  };

  return (
    <DashboardShell title="Configurações" subtitle="Ajuste as preferências da sua operação.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Loja">
          <Field label="Nome da loja"><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></Field>
          <Field label="E-mail da conta"><Input value={user?.email || ""} disabled /></Field>
          <Field label="Meta diária de vendas"><Input type="number" value={meta} onChange={(e) => setMeta(e.target.value)} /></Field>
        </Card>

        <Card title="Dados bancários para recebimento">
          <p className="text-xs text-muted-foreground">
            Usados para o recebimento das suas comissões. Ficam salvos apenas neste navegador.
          </p>
          <BankField label="Nome completo" value={bank.nomeCompleto} onChange={setBankField("nomeCompleto")} error={bankErrors.nomeCompleto} />
          <BankField label="CPF ou CNPJ" value={bank.documento} onChange={setBankField("documento")} error={bankErrors.documento} inputMode="numeric" />
          <BankField label="Chave PIX" value={bank.chavePix} onChange={setBankField("chavePix")} error={bankErrors.chavePix} />
          <BankField label="Banco" value={bank.banco} onChange={setBankField("banco")} error={bankErrors.banco} />
          <div className="grid grid-cols-2 gap-3">
            <BankField label="Agência" value={bank.agencia} onChange={setBankField("agencia")} error={bankErrors.agencia} inputMode="numeric" />
            <BankField label="Conta" value={bank.conta} onChange={setBankField("conta")} error={bankErrors.conta} />
          </div>
          <div className="pt-1">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleSaveBank}>Salvar dados bancários</Button>
          </div>
        </Card>

        <Card title="Preferências comerciais">
          <Field label="Margem padrão de lucro (%)"><Input type="number" value={margem} onChange={(e) => setMargem(e.target.value)} /></Field>
          <Field label="Taxa estimada da Shopee (%)"><Input type="number" value={taxa} onChange={(e) => setTaxa(e.target.value)} /></Field>
          <Field label="Preferência de fornecedores">
            <Select value={pref} onValueChange={setPref}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RioStock">RioStock Distribuidora</SelectItem>
                <SelectItem value="SP">SP Prime Atacado</SelectItem>
                <SelectItem value="Auto">Automático (menor preço)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card title="Aparência e notificações">
          <Field label="Cor de destaque">
            <Select value={cor} onValueChange={setCor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Laranja">Laranja</SelectItem>
                <SelectItem value="Vermelho">Vermelho</SelectItem>
                <SelectItem value="Azul">Azul</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
            <div>
              <div className="text-sm font-medium">Notificações</div>
              <div className="text-xs text-muted-foreground">Receba alertas de vendas e comissões.</div>
            </div>
            <Switch checked={notif} onCheckedChange={setNotif} />
          </div>
        </Card>

        <Card title="Financeiro">
          <p className="text-xs text-muted-foreground">
            Solicite o saque das suas comissões. O pedido será enviado para análise da equipe UpShopee.
          </p>
          <p className="text-[11px] text-muted-foreground">
            O saque ficará disponível após 30 dias de conta ativa. Os valores exibidos podem não representar saldo real disponível para saque.
          </p>
          <div className="pt-1">
            <WithdrawalButton />
          </div>
        </Card>

        {isAdmin && (
          <Card title="Administração">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Zap className="h-4 w-4 text-primary" /> Modo demonstração</div>
              <p className="mt-1 text-xs text-muted-foreground">Botão de simulação ativo no canto inferior direito.</p>
            </div>
          </Card>
        )}

        <div className="lg:col-span-2 flex justify-end">
          <Button className="w-full sm:w-auto" onClick={() => toast.success("Configurações salvas.")}>Salvar alterações</Button>
        </div>
      </div>
    </DashboardShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 space-y-3"><h3 className="text-sm font-semibold">{title}</h3>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
function BankField({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input aria-invalid={!!error} className={error ? "border-destructive focus-visible:ring-destructive" : ""} {...props} />
      {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
    </div>
  );
}