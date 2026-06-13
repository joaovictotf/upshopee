import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import {
  useApp,
  MARKETPLACE_LABEL,
  type Marketplace,
  type AccountRecord,
  type ApprovalStatus,
  type SavedProduct,
  type UserConnections,
  MARKETPLACES,
} from "../lib/state";
import { brl } from "../lib/format";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Store as StoreIcon,
  Mail,
  Phone,
  Clock,
  Lock,
  Zap,
  User as UserIcon,
  Search,
  Package,
  Store,
  X,
  RefreshCw,
  PackageCheck,
  Hourglass,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";

export const Route = createFileRoute("/dashboard/validar-cadastros")({ component: ValidarCadastros });

const COMMISSION_PRESETS = [12.9, 15.4, 18.7, 22.3, 24.9, 27.5, 29.9];

const STATUS_TONE: Record<ApprovalStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  blocked_payment: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};
const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  blocked_payment: "Bloqueado por pagamento",
};

type FilterKey = "all" | ApprovalStatus;
type AccountRow = AccountRecord & { email: string };
type ConnFilter = "all" | "pending" | "approved";
type ProductFilter = "all" | "pending" | "approved";

function formatDateTimeBR(ts?: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} às ${hh}:${mi}`;
}

function ValidarCadastros() {
  const {
    isAdmin,
    listAccounts,
    approveAccount,
    rejectAccount,
    addManualCommissionToUser,
    bulkAdminDemoCommissionShopee,
    adminCreateBoostCampaign,
    adminCancelBoostCampaign,
    getActiveBoostByUserId,
    getUserConnectedMarketplaces,
    getUserProducts,
    refreshAccounts,
    getUserConnectionsByEmail,
    validateMarketplaceConnection,
    rejectMarketplaceConnection,
    allUserProducts,
    validateUserProduct,
    refreshAllUserProducts,
    validateAllPendingProducts,
    validateUserPendingProducts,
    validateAllPendingConnections,
    validateUserPendingConnections,
    bulkApproveAllProductsAndMakeReady,
    getUserCommissionTotal,
    adminPresentationMode,
    blockAccountPayment,
    unblockAccountPayment,
    approveAllPendingAccounts,
  } = useApp();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkConn, setBulkConn] = useState(false);
  const [bulkProd, setBulkProd] = useState(false);
  const [bulkAcc, setBulkAcc] = useState(false);
  const [bulkCommissionOpen, setBulkCommissionOpen] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkApproveAllConfirm, setBulkApproveAllConfirm] = useState(false);
  const [bulkApproveAllRunning, setBulkApproveAllRunning] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate({ to: "/dashboard" });
    if (isAdmin && adminPresentationMode) navigate({ to: "/dashboard" });
  }, [isAdmin, adminPresentationMode, navigate]);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [connFilter, setConnFilter] = useState<ConnFilter>("all");
  const [prodFilter, setProdFilter] = useState<ProductFilter>("all");
  const [query, setQuery] = useState("");
  const accounts = useMemo(() => listAccounts(), [listAccounts, tick]);

  const productsByUserId = useMemo(() => {
    const map = new Map<string, typeof allUserProducts>();
    for (const p of allUserProducts) {
      const arr = map.get(p.userId) ?? [];
      arr.push(p);
      map.set(p.userId, arr);
    }
    return map;
  }, [allUserProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      const status = (a.status ?? "approved") as ApprovalStatus;
      if (filter !== "all" && status !== filter) return false;
      const conns = a.userId ? getUserConnectionsByEmail(a.email) : {};
      const connVals = Object.values(conns);
      if (connFilter === "pending" && !connVals.some((v) => v === "pending_validation")) return false;
      if (connFilter === "approved" && !connVals.some((v) => v === "approved")) return false;
      const prods = a.userId ? productsByUserId.get(a.userId) ?? [] : [];
      if (prodFilter === "pending" && !prods.some((p) => p.validationStatus === "pending_validation")) return false;
      if (prodFilter === "approved" && !prods.some((p) => p.validationStatus === "approved")) return false;
      if (!q) return true;
      const name = (a.name || "").toLowerCase();
      const email = (a.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [accounts, filter, connFilter, prodFilter, query, getUserConnectionsByEmail, productsByUserId]);

  const counts = useMemo(() => {
    const c: Record<ApprovalStatus, number> = { pending: 0, approved: 0, rejected: 0, blocked_payment: 0 };
    for (const a of accounts) c[(a.status ?? "approved") as ApprovalStatus] += 1;
    return c;
  }, [accounts]);

  const [productsFor, setProductsFor] = useState<AccountRow | null>(null);
  const [commissionFor, setCommissionFor] = useState<AccountRow | null>(null);
  const [boostFor, setBoostFor] = useState<AccountRow | null>(null);
  const [boostDetailsFor, setBoostDetailsFor] = useState<AccountRow | null>(null);
  const [blockFor, setBlockFor] = useState<AccountRow | null>(null);
  const [unblockFor, setUnblockFor] = useState<AccountRow | null>(null);

  if (!isAdmin || adminPresentationMode) return null;

  return (
    <DashboardShell title="Validar Cadastros" subtitle="Aprove, pesquise e gerencie usuários da ShopeSync.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<ShieldAlert className="h-4 w-4" />} label="Cadastros pendentes" value={String(counts.pending)} accent />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Cadastros aprovados" value={String(counts.approved)} />
        <Stat icon={<Lock className="h-4 w-4" />} label="Cadastros recusados" value={String(counts.rejected)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setBulkAcc(true)}>
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Validar todas as contas
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkConn(true)}>
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Validar todas as conexões
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBulkProd(true)}>
          <PackageCheck className="mr-1 h-3.5 w-3.5" /> Validar todos os produtos
        </Button>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
          disabled={bulkApproveAllRunning}
          onClick={() => setBulkApproveAllConfirm(true)}
        >
          <PackageCheck className="mr-1 h-3.5 w-3.5" /> Liberar todos os produtos (Pronto para venda)
        </Button>
        <Button
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
          onClick={() => setBulkCommissionOpen(true)}
        >
          <Zap className="mr-1 h-3.5 w-3.5" /> Adicionar comissão em massa
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome ou e-mail..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "pending", "approved", "rejected", "blocked_payment"] as FilterKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {k === "all" ? "Todos" : k === "blocked_payment" ? "Bloqueados" : STATUS_LABEL[k as ApprovalStatus]}
            </button>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try { await refreshAccounts(); refresh(); toast.success("Cadastros atualizados."); }
              finally { setRefreshing(false); }
            }}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <FilterGroup label="Conexões" value={connFilter} onChange={(v) => setConnFilter(v as ConnFilter)}
          options={[{ k: "all", l: "Todas as conexões" }, { k: "pending", l: "Conexões não validadas" }, { k: "approved", l: "Conexões validadas" }]} />
        <FilterGroup label="Produtos" value={prodFilter} onChange={(v) => setProdFilter(v as ProductFilter)}
          options={[{ k: "all", l: "Todos os produtos" }, { k: "pending", l: "Produtos não liberados" }, { k: "approved", l: "Produtos liberados" }]} />
      </div>

      <div className="mt-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {query.trim()
              ? "Nenhum cadastro encontrado."
              : filter === "pending"
                ? "Nenhum cadastro pendente. Novos cadastros aparecerão aqui para validação."
                : "Nenhum usuário encontrado."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((acc) => (
              <AccountCard
                key={acc.email}
                acc={acc}
                connections={getUserConnectionsByEmail(acc.email)}
                pendingProductCount={acc.userId ? (productsByUserId.get(acc.userId) ?? []).filter((p) => p.validationStatus === "pending_validation").length : 0}
                totalProductCount={acc.userId ? (productsByUserId.get(acc.userId) ?? []).length : 0}
                commissionTotal={acc.userId ? getUserCommissionTotal(acc.userId) : 0}
                onValidateAllUserConn={async () => {
                  if (!acc.userId) return;
                  const r = await validateUserPendingConnections(acc.userId);
                  if (!r.ok) { toast.error(r.error || "Falha."); return; }
                  toast.success(`Conexões deste usuário validadas (${r.count ?? 0}).`);
                }}
                onValidateAllUserProd={async () => {
                  if (!acc.userId) return;
                  const r = await validateUserPendingProducts(acc.userId);
                  if (!r.ok) { toast.error(r.error || "Falha."); return; }
                  toast.success(`Produtos deste usuário validados (${r.count ?? 0}).`);
                }}
                onValidateConnection={async (mp) => {
                  if (!acc.userId) { toast.error("ID do usuário ausente."); return; }
                  const r = await validateMarketplaceConnection(acc.userId, mp);
                  if (!r.ok) { toast.error(r.error || "Falha ao validar."); return; }
                  toast.success("Conexão validada com sucesso.");
                  refresh();
                }}
                onRejectConnection={async (mp) => {
                  if (!acc.userId) { toast.error("ID do usuário ausente."); return; }
                  const r = await rejectMarketplaceConnection(acc.userId, mp);
                  if (!r.ok) { toast.error(r.error || "Falha ao recusar."); return; }
                  toast("Conexão recusada.");
                  refresh();
                }}
                onApprove={async () => {
                  if (!acc.userId) { toast.error("ID do usuário ausente."); return; }
                  const r = await approveAccount(acc.userId);
                  if (!r.ok) { toast.error(r.error || "Falha ao aprovar."); return; }
                  toast.success("Cadastro aprovado com sucesso.");
                  refresh();
                }}
                onReject={async () => {
                  if (!acc.userId) { toast.error("ID do usuário ausente."); return; }
                  const r = await rejectAccount(acc.userId);
                  if (!r.ok) { toast.error(r.error || "Falha ao recusar."); return; }
                  toast("Cadastro recusado.");
                  refresh();
                }}
                onShowProducts={() => setProductsFor(acc)}
                onAddCommission={() => setCommissionFor(acc)}
                activeBoost={acc.userId ? getActiveBoostByUserId(acc.userId) : null}
                onApproveBoost={() => setBoostFor(acc)}
                onShowBoost={() => setBoostDetailsFor(acc)}
                onBlockPayment={() => setBlockFor(acc)}
                onUnblockPayment={() => setUnblockFor(acc)}
              />
            ))}
          </div>
        )}
      </div>

      <ProductsDialog
        acc={productsFor}
        onClose={() => setProductsFor(null)}
        getUserProducts={getUserProducts}
        onValidateProduct={async (remoteId) => {
          const r = await validateUserProduct(remoteId);
          if (!r.ok) { toast.error(r.error || "Falha ao validar produto."); return; }
          toast.success("Produto validado com sucesso.");
        }}
        onValidateAll={async (userId) => {
          const r = await validateUserPendingProducts(userId);
          if (!r.ok) { toast.error(r.error || "Falha."); return; }
          toast.success(`Produtos validados (${r.count ?? 0}).`);
        }}
        onUpsertAndValidate={async (product, userId) => {
          const { data: newRow, error: upsertErr } = await (supabase
            .from("user_products" as never)
            .upsert({
              user_id: userId,
              local_id: product.id,
              name: product.name,
              image: product.image || null,
              category: product.category || null,
              marketplaces: product.marketplaces,
              supplier_name: product.supplierName || null,
              supplier_location: product.supplierLocation || null,
              supplier_cost: product.supplierCost || null,
              recommended_price: product.recommendedPrice || null,
              estimated_commission: product.estimatedCommission || null,
              product_id: product.productId || null,
              status: "Aguardando validação",
              current_step: "Aguardando validação do produto",
              validation_status: "pending_validation",
            } as never)
            .select("id")
            .single() as unknown as Promise<{ data: { id: string } | null; error: Error | null }>);
          if (upsertErr || !newRow?.id) {
            toast.error("Falha ao sincronizar produto.");
            return;
          }
          await refreshAllUserProducts();
          const r = await validateUserProduct(newRow.id);
          if (!r.ok) { toast.error(r.error || "Falha ao validar produto."); return; }
          toast.success("Produto sincronizado e validado com sucesso.");
        }}
      />

      <CommissionDialog
        acc={commissionFor}
        onClose={() => setCommissionFor(null)}
        getUserConnectedMarketplaces={getUserConnectedMarketplaces}
        getUserProducts={getUserProducts}
        onSubmit={async (email, mp, amount, productId) => {
          const r = await addManualCommissionToUser(email, mp, amount, productId);
          if (!r.ok) { toast.error(r.error || "Não foi possível adicionar a comissão demo."); return false; }
          toast.success("Comissão demo adicionada com sucesso.", {
            description: `Venda registrada para o usuário selecionado. ${MARKETPLACE_LABEL[mp]} · ${brl(amount)}`,
          });
          refresh();
          return true;
        }}
      />

      <AlertDialog open={bulkAcc} onOpenChange={setBulkAcc}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar todas as contas</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja aprovar todas as contas pendentes?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const r = await approveAllPendingAccounts();
              if (!r.ok) { toast.error(r.error || "Falha."); return; }
              toast.success("Todas as contas pendentes foram validadas.", { description: `Contas aprovadas: ${r.count ?? 0}` });
              refresh();
            }}>Validar todas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConn} onOpenChange={setBulkConn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar todas as conexões pendentes</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja validar todas as conexões pendentes?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const r = await validateAllPendingConnections();
              if (!r.ok) { toast.error(r.error || "Falha."); return; }
              toast.success("Todas as conexões pendentes foram validadas.");
            }}>Validar conexões</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkProd} onOpenChange={setBulkProd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar todos os produtos pendentes</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja validar todos os produtos pendentes?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              const r = await validateAllPendingProducts();
              if (!r.ok) { toast.error(r.error || "Falha."); return; }
              toast.success("Todos os produtos pendentes foram validados.");
            }}>Validar produtos</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkApproveAllConfirm} onOpenChange={(o) => { if (!bulkApproveAllRunning) setBulkApproveAllConfirm(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar TODOS os produtos como Pronto para venda</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação vai marcar <strong>todos os produtos</strong> no banco como aprovados e &quot;Pronto para venda&quot;,
              independente do status atual. Use para liberar produtos que ficaram presos por causa do bug de aprovação automática.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkApproveAllRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkApproveAllRunning}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async (e) => {
                e.preventDefault();
                setBulkApproveAllRunning(true);
                const r = await bulkApproveAllProductsAndMakeReady();
                setBulkApproveAllRunning(false);
                if (!r.ok) { toast.error(r.error || "Falha ao liberar produtos."); return; }
                toast.success(`Todos os produtos foram liberados como Pronto para venda.`);
                setBulkApproveAllConfirm(false);
                refresh();
              }}
            >
              {bulkApproveAllRunning ? "Liberando..." : "Confirmar — Liberar todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!blockFor} onOpenChange={(o) => { if (!o) setBlockFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear acesso</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja bloquear este usuário por falta de pagamento?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={async () => {
                const acc = blockFor;
                if (!acc?.userId) { toast.error("ID do usuário ausente."); return; }
                const r = await blockAccountPayment(acc.userId);
                if (!r.ok) { toast.error(r.error || "Falha ao bloquear."); return; }
                toast.success("Usuário bloqueado por falta de pagamento.");
                setBlockFor(null);
                refresh();
              }}
            >Bloquear acesso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!unblockFor} onOpenChange={(o) => { if (!o) setUnblockFor(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar acesso</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja liberar o acesso deste usuário novamente?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const acc = unblockFor;
                if (!acc?.userId) { toast.error("ID do usuário ausente."); return; }
                const r = await unblockAccountPayment(acc.userId);
                if (!r.ok) { toast.error(r.error || "Falha ao liberar."); return; }
                toast.success("Acesso liberado com sucesso.");
                setUnblockFor(null);
                refresh();
              }}
            >Liberar acesso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={bulkCommissionOpen} onOpenChange={(o) => { if (!bulkRunning) { setBulkCommissionOpen(o); if (!o) { setBulkAmount(""); setBulkNote(""); } } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar comissão em massa</DialogTitle>
            <DialogDescription>
              Essa ação criará uma venda com comissão para todas as contas aprovadas, com conexão Shopee validada e produtos prontos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor da comissão</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 45,00"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                disabled={bulkRunning}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Observação interna</label>
              <Input
                placeholder="Ex: ação de teste, campanha, impulsionamento..."
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                disabled={bulkRunning}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" disabled={bulkRunning} onClick={() => setBulkCommissionOpen(false)}>Cancelar</Button>
            <Button
              disabled={bulkRunning}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => {
                const v = Number(String(bulkAmount).replace(",", "."));
                if (!(v > 0)) { toast.error("Informe um valor válido de comissão."); return; }
                setBulkConfirm(true);
              }}
            >
              Adicionar para todas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkConfirm} onOpenChange={(o) => { if (!bulkRunning) setBulkConfirm(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar comissão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja adicionar essa comissão para todas as contas elegíveis?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkRunning}
              onClick={async (e) => {
                e.preventDefault();
                const v = Number(String(bulkAmount).replace(",", "."));
                if (!(v > 0)) { toast.error("Informe um valor válido de comissão."); return; }
                setBulkRunning(true);
                const r = await bulkAdminDemoCommissionShopee(v, bulkNote.trim() || undefined);
                setBulkRunning(false);
                if (!r.ok) { toast.error(r.error || "Falha ao executar ação em massa."); return; }
                if ((r.errors ?? 0) > 0) {
                  toast.error("Algumas contas não foram atualizadas.", {
                    description: `Elegíveis: ${r.eligible ?? 0} · Vendas criadas: ${r.success ?? 0} · Ignoradas: ${r.skipped ?? 0} · Erros: ${r.errors ?? 0} · Valor por conta: ${brl(v)}`,
                  });
                } else {
                  toast.success("Comissão em massa adicionada com sucesso.", {
                    description: `Elegíveis: ${r.eligible ?? 0} · Vendas criadas: ${r.success ?? 0} · Ignoradas: ${r.skipped ?? 0} · Valor por conta: ${brl(v)}`,
                  });
                  if ((r.skipped ?? 0) > 0) {
                    toast("Algumas contas foram ignoradas por não possuírem conexão Shopee validada ou produtos prontos.");
                  }
                }
                setBulkConfirm(false);
                setBulkCommissionOpen(false);
                setBulkAmount("");
                setBulkNote("");
                refresh();
              }}
            >
              {bulkRunning ? "Processando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BoostApprovalDialogs
        boostFor={boostFor}
        setBoostFor={setBoostFor}
        boostDetailsFor={boostDetailsFor}
        setBoostDetailsFor={setBoostDetailsFor}
        getActiveBoostByUserId={getActiveBoostByUserId}
        getUserConnectionsByEmail={getUserConnectionsByEmail}
        adminCreateBoostCampaign={adminCreateBoostCampaign}
        adminCancelBoostCampaign={adminCancelBoostCampaign}
        refresh={refresh}
      />
    </DashboardShell>
  );
}

const BOOST_PACKS = [
  { id: "inicio" as const, label: "Pack Início — R$ 24,00", value: 24 },
  { id: "aceleracao" as const, label: "Pack Aceleração — R$ 50,00", value: 50 },
  { id: "escala" as const, label: "Pack Escala — R$ 150,00", value: 150 },
  { id: "maximo" as const, label: "Pack Máximo — R$ 400,00", value: 400 },
];

function BoostApprovalDialogs({
  boostFor, setBoostFor, boostDetailsFor, setBoostDetailsFor,
  getActiveBoostByUserId, getUserConnectionsByEmail, adminCreateBoostCampaign, adminCancelBoostCampaign, refresh,
}: {
  boostFor: AccountRow | null;
  setBoostFor: (a: AccountRow | null) => void;
  boostDetailsFor: AccountRow | null;
  setBoostDetailsFor: (a: AccountRow | null) => void;
  getActiveBoostByUserId: (userId: string) => { id: string; packName: string; packValue: number; startsAt: string; endsAt: string; eventsTotal: number; eventsReleased: number; commissionTotal: number } | null;
  getUserConnectionsByEmail: (email: string) => UserConnections;
  adminCreateBoostCampaign: (userId: string, packId: "inicio" | "aceleracao" | "escala" | "maximo", startsAt: string, note: string | undefined, replace: boolean) => Promise<{ ok: boolean; error?: string; campaignId?: string; packName?: string; packValue?: number }>;
  adminCancelBoostCampaign: (campaignId: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => void;
}) {
  const [packId, setPackId] = useState<"inicio" | "aceleracao" | "escala" | "maximo">("escala");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ packName: string; userName: string } | null>(null);

  useEffect(() => {
    if (boostFor) {
      setPackId("escala");
      setStartDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setSuccessInfo(null);
    }
  }, [boostFor]);

  const conn = boostFor?.userId ? getUserConnectionsByEmail(boostFor.email) : {};
  const shopeeStatus = conn.shopee;
  const shopeeStatusLabel = shopeeStatus === "approved" ? "Conexão validada" : shopeeStatus === "pending_validation" ? "Em análise" : shopeeStatus === "rejected" ? "Recusada" : "Sem conexão";

  const doActivate = async (replace: boolean) => {
    if (!boostFor?.userId) return;
    setRunning(true);
    const startIso = new Date(startDate + "T00:00:00").toISOString();
    const r = await adminCreateBoostCampaign(boostFor.userId, packId, startIso, note.trim() || undefined, replace);
    setRunning(false);
    if (!r.ok) {
      if (r.error === "already_active" || /already_active/.test(r.error || "")) {
        setReplaceOpen(true);
        return;
      }
      if (r.error === "no_products" || /no_products/.test(r.error || "")) {
        toast.error("Este usuário precisa ter pelo menos um produto em Meus Produtos para receber vendas do impulsionamento.");
        return;
      }
      toast.error("Não foi possível ativar o impulsionamento agora.", { description: r.error });
      return;
    }
    setConfirmOpen(false);
    setReplaceOpen(false);
    setSuccessInfo({ packName: r.packName || "", userName: boostFor.name || boostFor.email });
    toast.success("Impulsionamento ativado com sucesso.", {
      description: `Período: 7 dias · Pack: ${r.packName} · Conta: ${boostFor.name || boostFor.email}`,
    });
    refresh();
  };

  const details = boostDetailsFor?.userId ? getActiveBoostByUserId(boostDetailsFor.userId) : null;

  return (
    <>
      <Dialog open={!!boostFor} onOpenChange={(o) => { if (!o && !running) setBoostFor(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Aprovar impulsionamento</DialogTitle>
            <DialogDescription>
              Selecione o pack comprado pelo usuário para ativar uma simulação de impulsionamento por 7 dias.
            </DialogDescription>
          </DialogHeader>

          {boostFor && !successInfo && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{boostFor.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span className="font-medium">{boostFor.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status da conta</span><span className="font-medium">{STATUS_LABEL[(boostFor.status ?? "approved") as ApprovalStatus]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status Shopee</span><span className="font-medium">{shopeeStatusLabel}</span></div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Pack comprado</label>
                <select
                  value={packId}
                  onChange={(e) => setPackId(e.target.value as typeof packId)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={running}
                >
                  {BOOST_PACKS.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Início do impulsionamento</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={running} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Duração</label>
                  <Input value="7 dias" readOnly disabled />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Observação interna</label>
                <Input
                  placeholder="Ex: cliente comprou o Pack Escala no checkout."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={running}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" disabled={running} onClick={() => setBoostFor(null)}>Cancelar</Button>
                <Button
                  disabled={running}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                  onClick={() => setConfirmOpen(true)}
                >
                  Ativar impulsionamento
                </Button>
              </div>
            </div>
          )}

          {successInfo && (
            <div className="space-y-3 py-2 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <div className="text-base font-semibold">Impulsionamento ativado com sucesso.</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Período: 7 dias</div>
                <div>Pack: {successInfo.packName}</div>
                <div>Conta: {successInfo.userName}</div>
              </div>
              <Button className="w-full" onClick={() => setBoostFor(null)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!running) setConfirmOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja ativar o impulsionamento para este usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Durante 7 dias, o sistema criará movimentações demonstrativas de comissão para essa conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={running} onClick={(e) => { e.preventDefault(); void doActivate(false); }}>
              {running ? "Ativando..." : "Confirmar ativação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={replaceOpen} onOpenChange={(o) => { if (!running) setReplaceOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Este usuário já possui um impulsionamento ativo.</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja substituir o impulsionamento ativo por este novo pack? O impulsionamento anterior será cancelado e os eventos ainda não liberados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={running} onClick={(e) => { e.preventDefault(); void doActivate(true); }}>
              {running ? "Substituindo..." : "Substituir impulsionamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!boostDetailsFor} onOpenChange={(o) => { if (!o) setBoostDetailsFor(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impulsionamento ativo</DialogTitle>
            <DialogDescription>Detalhes do impulsionamento em andamento para esta conta.</DialogDescription>
          </DialogHeader>
          {boostDetailsFor && details && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Conta</span><span className="font-medium">{boostDetailsFor.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pack</span><span className="font-medium">{details.packName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Valor do pack</span><span className="font-medium">{brl(details.packValue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Início</span><span className="font-medium">{formatDateTimeBR(new Date(details.startsAt).getTime())}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fim</span><span className="font-medium">{formatDateTimeBR(new Date(details.endsAt).getTime())}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Eventos liberados</span><span className="font-medium">{details.eventsReleased} de {details.eventsTotal}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comissão demo gerada</span><span className="font-medium">{brl(details.commissionTotal)}</span></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBoostDetailsFor(null)}>Fechar</Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const r = await adminCancelBoostCampaign(details.id);
                    if (!r.ok) { toast.error(r.error || "Falha ao cancelar."); return; }
                    toast("Impulsionamento cancelado.");
                    setBoostDetailsFor(null);
                    refresh();
                  }}
                >
                  Cancelar impulsionamento
                </Button>
              </div>
            </div>
          )}
          {boostDetailsFor && !details && (
            <div className="py-2 text-sm text-muted-foreground">Nenhum impulsionamento ativo para esta conta.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ k: string; l: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}:</span>
      {options.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${value === o.k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${accent ? "bg-primary/15 text-primary" : "bg-background/60 text-foreground/70"}`}>{icon}</span>
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function AccountCard({
  acc,
  connections,
  pendingProductCount,
  totalProductCount,
  commissionTotal,
  onValidateAllUserConn,
  onValidateAllUserProd,
  onValidateConnection,
  onRejectConnection,
  onApprove,
  onReject,
  onShowProducts,
  onAddCommission,
  activeBoost,
  onApproveBoost,
  onShowBoost,
  onBlockPayment,
  onUnblockPayment,
}: {
  acc: AccountRow;
  connections: UserConnections;
  pendingProductCount: number;
  totalProductCount: number;
  commissionTotal: number;
  onValidateAllUserConn: () => void;
  onValidateAllUserProd: () => void;
  onValidateConnection: (mp: Marketplace) => void;
  onRejectConnection: (mp: Marketplace) => void;
  onApprove: () => void;
  onReject: () => void;
  onShowProducts: () => void;
  onAddCommission: () => void;
  activeBoost: { id: string; packName: string; packValue: number; startsAt: string; endsAt: string; eventsTotal: number; eventsReleased: number; commissionTotal: number } | null;
  onApproveBoost: () => void;
  onShowBoost: () => void;
  onBlockPayment: () => void;
  onUnblockPayment: () => void;
}) {
  const status = (acc.status ?? "approved") as ApprovalStatus;
  const requestedMps = MARKETPLACES.filter((m) => !!connections[m]);
  const hasPendingConn = requestedMps.some((m) => connections[m] === "pending_validation");
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{acc.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cadastro: {formatDateTimeBR(acc.createdAt)}</div>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> <span className="truncate">{acc.email}</span></div>
        <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {acc.phone || "—"}</div>
        <div className="flex items-center gap-2 text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Senha protegida — não exibida</div>
        {status === "approved" && acc.approvedAt && (
          <div className="flex items-center gap-2 text-emerald-400"><Clock className="h-3.5 w-3.5" /> Aprovado em {formatDateTimeBR(acc.approvedAt)}</div>
        )}
      </div>

      {/* Balance + product count summary bar */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
          <div className="text-[10px] uppercase tracking-widest text-emerald-400/70">Saldo em comissões</div>
          <div className={`mt-0.5 text-sm font-bold ${commissionTotal > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {brl(commissionTotal)}
          </div>
        </div>
        <button
          onClick={onShowProducts}
          className="rounded-lg border border-primary/25 bg-primary/8 px-3 py-2 text-left transition hover:border-primary/50 hover:bg-primary/15"
        >
          <div className="text-[10px] uppercase tracking-widest text-primary/70">Produtos</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-primary">{totalProductCount}</span>
            {pendingProductCount > 0 && (
              <span className="text-[10px] font-medium text-amber-400">· {pendingProductCount} aguardando</span>
            )}
          </div>
        </button>
      </div>

      {status === "pending" && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1" onClick={onApprove}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Validar cadastro</Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={onReject}>Recusar cadastro</Button>
        </div>
      )}

      {status === "approved" && requestedMps.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <StoreIcon className="h-3 w-3" /> Conexões solicitadas
          </div>
          <div className="space-y-2">
            {requestedMps.map((mp) => {
              const s = connections[mp]!;
              const tone =
                s === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                s === "rejected" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                "bg-amber-500/15 text-amber-300 border-amber-500/30";
              const label =
                s === "approved" ? "Conexão validada" :
                s === "rejected" ? "Conexão recusada" :
                "Aguardando validação";
              return (
                <div key={mp} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card/60 p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{MARKETPLACE_LABEL[mp]}</span>
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>{label}</span>
                  </div>
                  {s !== "approved" && (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => onValidateConnection(mp)}>
                        <ShieldCheck className="mr-1 h-3 w-3" /> Validar conexão {MARKETPLACE_LABEL[mp]}
                      </Button>
                      {s !== "rejected" && (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => onRejectConnection(mp)}>
                          Recusar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onShowProducts}>
          <Package className="mr-1 h-3.5 w-3.5" /> Ver produtos
        </Button>
        {status === "approved" && (
          <Button size="sm" onClick={onAddCommission}>
            <Zap className="mr-1 h-3.5 w-3.5" /> Adicionar comissão demo
          </Button>
        )}
        {status === "approved" && !activeBoost && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            onClick={onApproveBoost}
          >
            <Zap className="mr-1 h-3.5 w-3.5" /> Aprovar impulsionamento
          </Button>
        )}
        {activeBoost && (
          <Button size="sm" variant="outline" onClick={onShowBoost}>
            <Zap className="mr-1 h-3.5 w-3.5" /> Ver impulsionamento
          </Button>
        )}
        {status === "approved" && hasPendingConn && (
          <Button size="sm" variant="outline" onClick={onValidateAllUserConn}>
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Validar conexões deste usuário
          </Button>
        )}
        {status === "approved" && pendingProductCount > 0 && (
          <Button size="sm" variant="outline" onClick={onValidateAllUserProd}>
            <PackageCheck className="mr-1 h-3.5 w-3.5" /> Validar produtos ({pendingProductCount})
          </Button>
        )}
        {status === "approved" && (
          <Button
            size="sm"
            variant="outline"
            className="border-orange-500/40 text-orange-600 hover:bg-orange-50"
            onClick={onBlockPayment}
          >
            <Lock className="mr-1 h-3.5 w-3.5" /> Bloquear por falta de pagamento
          </Button>
        )}
        {status === "blocked_payment" && (
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={onUnblockPayment}
          >
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Liberar acesso
          </Button>
        )}
      </div>

      {activeBoost && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              <Zap className="h-3 w-3" /> Impulsionamento ativo
            </span>
            <span className="text-[11px] font-medium text-amber-800">{activeBoost.packName} · R$ {activeBoost.packValue.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-amber-900">
            <div><span className="text-amber-700/70">Início:</span> {formatDateTimeBR(new Date(activeBoost.startsAt).getTime())}</div>
            <div><span className="text-amber-700/70">Fim:</span> {formatDateTimeBR(new Date(activeBoost.endsAt).getTime())}</div>
            <div><span className="text-amber-700/70">Eventos:</span> {activeBoost.eventsReleased}/{activeBoost.eventsTotal}</div>
            <div><span className="text-amber-700/70">Comissão demo:</span> {brl(activeBoost.commissionTotal)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductsDialog({
  acc,
  onClose,
  getUserProducts,
  onValidateProduct,
  onValidateAll,
  onUpsertAndValidate,
}: {
  acc: AccountRow | null;
  onClose: () => void;
  getUserProducts: (email: string) => SavedProduct[];
  onValidateProduct: (remoteId: string) => void | Promise<void>;
  onValidateAll: (userId: string) => void | Promise<void>;
  onUpsertAndValidate: (product: SavedProduct, userId: string) => Promise<void>;
}) {
  const products = acc ? getUserProducts(acc.email) : [];
  const pendingCount = products.filter((p) => p.productValidationStatus === "pending_validation").length;
  return (
    <Dialog open={!!acc} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle>Produtos de {acc?.name ?? ""}</DialogTitle>
          <DialogDescription>Produtos adicionados pelo usuário em "Meus Produtos".</DialogDescription>
        </DialogHeader>
        {pendingCount > 0 && acc?.userId && (
          <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
            <span className="text-amber-300">{pendingCount} produto(s) aguardando validação.</span>
            <Button size="sm" onClick={() => onValidateAll(acc.userId!)}>
              <PackageCheck className="mr-1 h-3.5 w-3.5" /> Validar produtos deste usuário
            </Button>
          </div>
        )}
        {products.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum produto adicionado ainda.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {products.map((p) => (
              <div key={p.id} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <img src={p.image} alt={p.name} className="h-16 w-16 shrink-0 rounded-md object-cover" loading="lazy" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.marketplaces.map((m) => (
                      <span key={m} className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{MARKETPLACE_LABEL[m]}</span>
                    ))}
                    {p.productValidationStatus === "pending_validation" ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300 inline-flex items-center gap-1"><Hourglass className="h-2.5 w-2.5" /> Aguardando validação</span>
                    ) : (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">{p.status}</span>
                    )}
                  </div>
                  <div className="mt-1 grid gap-1 text-muted-foreground sm:grid-cols-2">
                    <span>Fornecedor: {p.supplierName || "—"}</span>
                    <span>Local: {p.supplierLocation || "—"}</span>
                    <span>Custo: {brl(p.supplierCost)}</span>
                    <span>Venda recomendada: {brl(p.recommendedPrice)}</span>
                    <span>Comissão estimada: {brl(p.estimatedCommission)}</span>
                    <span>Adicionado em: {formatDateTimeBR(p.sentAt)}</span>
                    <span>Status: {p.status}</span>
                    <span>Validação: {p.productValidationStatus === "pending_validation" ? "Pendente" : "Produto validado"}</span>
                    <span className="sm:col-span-2">Etapa atual: {p.currentStep}</span>
                  </div>
                  {(p.productValidationStatus === "pending_validation" || p.needsSync) && (
                    <div className="mt-2">
                      <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() =>
                        p.needsSync ? onUpsertAndValidate(p, acc!.userId!) : onValidateProduct(p.remoteId!)
                      }>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Validar produto
                      </Button>
                    </div>
                  )}
                  {p.productValidationStatus === "approved" && (
                    <div className="mt-2 text-[11px] font-medium text-emerald-400">Produto validado</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}><X className="mr-1 h-3.5 w-3.5" /> Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommissionDialog({
  acc,
  onClose,
  getUserConnectedMarketplaces,
  getUserProducts,
  onSubmit,
}: {
  acc: AccountRow | null;
  onClose: () => void;
  getUserConnectedMarketplaces: (email: string) => Marketplace[];
  getUserProducts: (email: string) => SavedProduct[];
  onSubmit: (email: string, mp: Marketplace, amount: number, productId: string) => Promise<boolean>;
}) {
  const connected = acc ? getUserConnectedMarketplaces(acc.email) : [];
  const allProducts = acc
    ? getUserProducts(acc.email).filter((p) => p.productValidationStatus === "approved")
    : [];

  const [mp, setMp] = useState<Marketplace | "">("");
  const [productId, setProductId] = useState<string>("");
  const [amount, setAmount] = useState<string>("22,30");

  useEffect(() => {
    if (!acc) return;
    setMp(connected[0] ?? "");
    setProductId("");
    setAmount("22,30");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc?.email]);

  const productsForMp = useMemo(
    () => (mp ? allProducts.filter((p) => p.marketplaces.includes(mp)) : []),
    [mp, allProducts],
  );

  useEffect(() => {
    if (productId && !productsForMp.some((p) => p.id === productId)) setProductId("");
  }, [productsForMp, productId]);

  const parseAmount = (v: string) => {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return isFinite(n) ? n : NaN;
  };

  const handleSubmit = async () => {
    if (!acc) return;
    if (!mp) { toast.error("Selecione um marketplace para continuar."); return; }
    if (!productId) { toast.error("Selecione um produto para continuar."); return; }
    const n = parseAmount(amount);
    if (!isFinite(n) || n <= 0) { toast.error("Informe um valor válido de comissão."); return; }
    if (n > 30) { toast.error("A comissão demo para usuários comuns deve ser de até R$ 30,00."); return; }
    const ok = await onSubmit(acc.email, mp as Marketplace, Math.round(n * 100) / 100, productId);
    if (ok) onClose();
  };

  if (!acc) return null;

  return (
    <Dialog open={!!acc} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle>Adicionar comissão demo</DialogTitle>
          <DialogDescription>Usuário: {acc.name} ({acc.email})</DialogDescription>
        </DialogHeader>

        {connected.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Este usuário ainda não possui contas conectadas.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                <Store className="mr-1 inline h-3 w-3" /> Marketplace
              </label>
              <div className="flex flex-wrap gap-1.5">
                {connected.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMp(m)}
                    className={`rounded-md border px-3 py-1.5 text-xs ${mp === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/40 text-foreground/80 hover:text-foreground"}`}
                  >
                    {MARKETPLACE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                <Package className="mr-1 inline h-3 w-3" /> Produto
              </label>
              {allProducts.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Este usuário ainda não possui produtos em Meus Produtos.
                </p>
              ) : !mp ? (
                <p className="text-xs text-muted-foreground">Selecione um marketplace primeiro.</p>
              ) : productsForMp.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  Este usuário ainda não possui produtos validados.
                </p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border bg-background/30 p-1.5">
                  {productsForMp.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProductId(p.id)}
                      className={`flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition ${productId === p.id ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-background/60"}`}
                    >
                      <img src={p.image} alt={p.name} className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block text-[10px] text-muted-foreground">{p.status} · Venda {brl(p.recommendedPrice)} · {p.supplierName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">Valor da comissão (até R$ 30,00)</label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="22,30"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COMMISSION_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v.toFixed(2).replace(".", ","))}
                    className="rounded-md border border-border bg-background/40 px-2 py-1 text-[11px] hover:border-primary hover:text-primary"
                  >
                    {brl(v)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleSubmit} disabled={!mp || !productId}>
                <Zap className="mr-1 h-3.5 w-3.5" /> Adicionar comissão
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}