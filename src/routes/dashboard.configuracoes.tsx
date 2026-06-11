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

  return (
    <DashboardShell title="Configurações" subtitle="Ajuste as preferências da sua operação.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Loja">
          <Field label="Nome da loja"><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></Field>
          <Field label="E-mail da conta"><Input value={user?.email || ""} disabled /></Field>
          <Field label="Meta diária de vendas"><Input type="number" value={meta} onChange={(e) => setMeta(e.target.value)} /></Field>
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
            Solicite o saque das suas comissões. O pedido será enviado para análise da equipe ShopeSync.
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