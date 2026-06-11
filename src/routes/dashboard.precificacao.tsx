import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { products } from "../lib/mock/products";
import { suppliers } from "../lib/mock/suppliers";
import { brl } from "../lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/precificacao")({ component: Precificacao });

function Precificacao() {
  const [productId, setProductId] = useState(products[0].id);
  const [supplierId, setSupplierId] = useState("s1");
  const [margin, setMargin] = useState(30);

  const product = products.find((p) => p.id === productId)!;
  const supplier = suppliers.find((s) => s.id === supplierId)!;
  const supplierCost = supplierId === "s1" ? product.supplierCostRJ : product.supplierCostSP;

  const calc = useMemo(() => {
    const operational = Math.min(3.5, Math.max(0.9, supplierCost * 0.04));
    const fee = 0.14;
    const recommended = (supplierCost + supplierCost * (margin / 100) + operational) / (1 - fee);
    const netProfit = recommended - supplierCost - operational - recommended * fee;
    return { operational, fee, recommended, netProfit };
  }, [supplierCost, margin]);

  return (
    <DashboardShell title="Precificação" subtitle="Defina sua margem e veja o preço recomendado para vender na Shopee.">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Produto selecionado</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
            <img src={product.image} alt={product.name} className="h-16 w-16 rounded-md bg-white object-contain p-1" />
            <div>
              <div className="text-sm font-semibold leading-tight">{product.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{product.category}</div>
            </div>
          </div>

          <Label className="mt-5 block text-xs uppercase tracking-wide text-muted-foreground">Fornecedor selecionado</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.location}</SelectItem>)}</SelectContent>
          </Select>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Box label="Preço no fornecedor" value={brl(supplierCost)} />
            <Box label="Prazo de separação" value={supplier.dispatchTime} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Quanto você quer ter de lucro?</Label>
            <span className="text-base font-bold text-primary">{margin}%</span>
          </div>
          <Slider min={10} max={300} step={5} value={[margin]} onValueChange={(v) => setMargin(v[0])} className="mt-3" />

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Box label="Taxa estimada da Shopee" value={`${(calc.fee * 100).toFixed(0)}%`} />
            <Box label="Custo operacional estimado" value={brl(calc.operational)} />
            <Box label="Margem desejada" value={brl(supplierCost * (margin / 100))} />
          </div>

          <div className="mt-4 grid gap-3 grid-cols-1 md:grid-cols-3">
            <Big label="Preço recomendado de venda" value={brl(calc.recommended)} accent />
            <Big label="Lucro líquido estimado" value={brl(calc.netProfit)} />
            <Big label="Comissão estimada" value={brl(product.estimatedCommission)} />
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="w-full sm:w-auto" onClick={() => toast.success("Produto enviado para configuração.", { description: "Prazo médio: até 1 dia útil." })}>
              <Send className="mr-1 h-3.5 w-3.5" /> Enviar para minha loja Shopee
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-background/40 p-2.5"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-0.5 text-sm font-medium">{value}</div></div>;
}
function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-lg p-4 ${accent ? "bg-primary/10 border border-primary/30" : "bg-background/40 border border-border"}`}><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className={`mt-1 text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div></div>;
}