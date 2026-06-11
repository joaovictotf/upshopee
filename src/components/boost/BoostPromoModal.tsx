import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Button } from "../ui/button";
import { useApp } from "../../lib/state";
import { Rocket, ShieldCheck, TrendingUp } from "lucide-react";

const SEEN_KEY = (email: string) => `shopesync.boostpromo.seen.${email.toLowerCase()}`;

export function BoostPromoModal() {
  const { user, isAdmin, isPresentationAdmin, getCommissionSum } = useApp();
  const [open, setOpen] = useState(false);

  const total = user ? getCommissionSum("shopee", "30d") : 0;

  useEffect(() => {
    if (!user) return;
    if (isAdmin || isPresentationAdmin) return;
    if (total < 500) return;
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY(user.email)) === "1"; } catch {}
    if (!seen) setOpen(true);
  }, [user, isAdmin, isPresentationAdmin, total]);

  const markSeen = () => {
    if (!user) return;
    try { localStorage.setItem(SEEN_KEY(user.email), "1"); } catch {}
    setOpen(false);
  };

  const goBoost = () => {
    markSeen();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) markSeen(); }}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-[#EE4D2D] via-[#EE4D2D] to-[#7c3aed] px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/80">ShopSync</div>
              <h2 className="text-xl font-bold">Conheça o Impulsionar Vendas</h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white px-6 py-6 text-slate-800">
          <p className="text-sm leading-relaxed">
            Você já começou a gerar comissões dentro da ShopSync. Agora pode aumentar a
            visibilidade dos seus produtos com o <strong>Impulsionar Vendas</strong>.
          </p>

          <div className="flex items-start gap-3 rounded-xl border border-[#EE4D2D]/20 bg-[#EE4D2D]/5 p-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#EE4D2D]" />
            <p className="text-sm leading-relaxed text-slate-700">
              O Impulsionar Vendas ajuda seus produtos a receberem mais exposição, aumentando
              o alcance, as visualizações e as chances de conversão dentro da sua operação.
            </p>
          </div>

          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
              <ShieldCheck className="h-4 w-4 text-violet-700" />
              Garantia condicional
            </div>
            <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
              Caso o impulsionamento contratado não gere o retorno mínimo previsto dentro do
              período de acompanhamento, você poderá solicitar a análise da garantia
              condicional, conforme as regras do recurso.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={markSeen}>Agora não</Button>
            <Button
              onClick={goBoost}
              className="bg-[#EE4D2D] text-white hover:bg-[#d8431f]"
            >
              Ver Impulsionar Vendas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}