import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, UserPlus, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/adicionar-adms")({ component: Page });

type Row = Awaited<ReturnType<ReturnType<typeof useApp>["listAllProfiles"]>>[number];

function Page() {
  const { isAdmin, listAllProfiles, grantPresentationAdmin, revokePresentationAdmin } = useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ row: Row; action: "grant" | "revoke" } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) { navigate({ to: "/dashboard" }); return; }
  }, [isAdmin, navigate]);

  const refresh = async () => {
    setLoading(true);
    const r = await listAllProfiles();
    setRows(r);
    setLoading(false);
  };
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = rows.filter((r) => !r.isFullAdmin);
    if (!term) return base;
    return base.filter((r) => r.email.toLowerCase().includes(term) || r.fullName.toLowerCase().includes(term));
  }, [rows, q]);

  if (!isAdmin) {
    return (
      <DashboardShell title="Acesso restrito" subtitle="">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Acesso restrito ao administrador.
        </div>
      </DashboardShell>
    );
  }

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    const fn = confirm.action === "grant" ? grantPresentationAdmin : revokePresentationAdmin;
    const r = await fn(confirm.row.userId);
    setBusy(false);
    if (!r.ok) { toast.error(r.error || "Falha na operação."); return; }
    toast.success(confirm.action === "grant" ? "Acesso de apresentação liberado com sucesso." : "Acesso de apresentação removido com sucesso.");
    setConfirm(null);
    void refresh();
  };

  return (
    <DashboardShell title="Adicionar ADMs" subtitle="Libere acesso de apresentação para usuários cadastrados, sem conceder permissões administrativas completas.">
      <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        O acesso liberado aqui ativa apenas o raiozinho da Dashboard e métricas de apresentação. Essa pessoa não terá acesso a Validar Cadastros, Impulsionar Vendas ou ferramentas administrativas.
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome ou e-mail..." className="border-0 bg-transparent shadow-none focus-visible:ring-0" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {loading ? (
          <div className="grid place-items-center p-8 text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando contas...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {r.fullName}
                    {r.isPresentationAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        <ShieldCheck className="h-3 w-3" /> Apresentação
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Status: {r.approvalStatus} {r.createdAt ? `· Cadastro: ${new Date(r.createdAt).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <div>
                  {r.isPresentationAdmin ? (
                    <Button variant="outline" size="sm" onClick={() => setConfirm({ row: r, action: "revoke" })}>
                      Remover acesso de apresentação
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setConfirm({ row: r, action: "grant" })}>
                      <UserPlus className="mr-1 h-4 w-4" /> Liberar ADM
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "grant" ? "Liberar acesso de apresentação" : "Remover acesso de apresentação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "grant"
                ? "Tem certeza que deseja liberar o raiozinho e métricas de apresentação para este usuário? Essa pessoa não terá acesso a Validar Cadastros nem Impulsionar Vendas."
                : "Tem certeza que deseja remover o acesso de apresentação deste usuário? Ele perderá o raiozinho e as métricas de apresentação, mas a conta permanecerá ativa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void handleConfirm(); }}>
              {confirm?.action === "grant" ? "Liberar acesso" : "Remover acesso"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}