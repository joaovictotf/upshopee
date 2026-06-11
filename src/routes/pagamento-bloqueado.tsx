import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AlertOctagon, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/pagamento-bloqueado")({
  component: PagamentoBloqueado,
});

// Replace with the real WhatsApp link when available.
const WHATSAPP_PAYMENT_SUPPORT_URL = "INSERIR_LINK_DO_WHATSAPP_AQUI";

function PagamentoBloqueado() {
  const { logout, user, accountStatus, isAdmin } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    // Auto-release: if admin unblocked the user, send them back to the dashboard.
    if (user && (isAdmin || (accountStatus && accountStatus !== "blocked_payment"))) {
      try { sessionStorage.removeItem("shopesync.blocked_payment"); } catch {}
      if (accountStatus === "approved" || isAdmin) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, accountStatus, isAdmin, navigate]);
  return (
    <div className="min-h-screen grid place-items-center bg-white p-6">
      <div className="w-full max-w-md rounded-2xl border border-orange-200 bg-white p-8 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <img src="/brand/shopesync-logo.png" alt="ShopeSync" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold text-gray-900">ShopeSync</span>
        </div>
        <div className="mx-auto mt-6 grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-orange-600">
          <AlertOctagon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900">Pagamento não efetivado</h1>
        <p className="mt-4 text-sm text-gray-700">
          Seu pagamento não foi efetivado. Para continuar acessando a ShopeSync, regularize seu pagamento pelo WhatsApp.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          Lembrando: se você não se adaptar à plataforma, você tem 7 dias de garantia para solicitar reembolso dentro do prazo.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a href={WHATSAPP_PAYMENT_SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            <Button className="w-full bg-orange-500 text-white hover:bg-orange-600">Regularizar pelo WhatsApp</Button>
          </a>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try { sessionStorage.removeItem("shopesync.blocked_payment"); } catch {}
              await logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-1 h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}