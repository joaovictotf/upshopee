import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { CreditCard, MessageCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { VslVideo } from "../components/VslVideo";
import { useApp } from "../lib/state";

export const Route = createFileRoute("/pagamento-bloqueado")({
  component: PagamentoBloqueado,
});

// Real WhatsApp support line (replaces the old placeholder).
const WHATSAPP_MANAGER_URL = "https://wa.me/5534992017453";
// Auto-redirect delay (ms) if the user does not interact with either button.
const AUTO_REDIRECT_MS = 60_000;

function PagamentoBloqueado() {
  const { user, accountStatus, isAdmin } = useApp();
  const navigate = useNavigate();

  // Single delayed redirect. Kept in a ref so we can clear it on unmount and on
  // any button click. It targets /planos (a different public route that never
  // redirects back here), so it fires at most once and cannot loop.
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAutoRedirect = useCallback(() => {
    if (redirectTimer.current !== null) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
  }, []);

  // Auto-release: if an admin unblocked the user, send them back to the dashboard.
  useEffect(() => {
    if (user && (isAdmin || (accountStatus && accountStatus !== "blocked_payment"))) {
      try { sessionStorage.removeItem("shopesync.blocked_payment"); } catch {}
      if (accountStatus === "approved" || isAdmin) {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, accountStatus, isAdmin, navigate]);

  // 60s inactivity auto-redirect to /planos. Cleared on unmount.
  useEffect(() => {
    redirectTimer.current = setTimeout(() => {
      redirectTimer.current = null;
      navigate({ to: "/ofertas" });
    }, AUTO_REDIRECT_MS);
    return () => cancelAutoRedirect();
  }, [navigate, cancelAutoRedirect]);

  const goToPlans = useCallback(() => {
    cancelAutoRedirect();
    navigate({ to: "/ofertas" });
  }, [cancelAutoRedirect, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080808] px-4 py-10 text-white">
      <div className="w-full max-w-3xl flex flex-col items-center text-center">
        <img src="/brand/logo.png" alt="UpShopee" className="h-11 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />

        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
          Para continuar, adquira um plano
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/70 sm:text-base">
          Seu acesso está pausado. Assista ao vídeo abaixo para entender como a UpShopee
          funciona e escolha a melhor forma de liberar sua conta agora mesmo.
        </p>

        {/* Protagonist: the shared VSL video, large and central. */}
        <div className="mt-7 w-full">
          <VslVideo maxWidth={960} />
        </div>

        <div className="mt-7 flex w-full max-w-md flex-col gap-3">
          <Button
            onClick={goToPlans}
            className="h-12 w-full bg-[#EE4D2D] text-base font-semibold text-white hover:bg-[#d63f22]"
          >
            <CreditCard className="mr-2 h-5 w-5" /> Adquirir plano
          </Button>
          <a
            href={WHATSAPP_MANAGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={cancelAutoRedirect}
          >
            <Button
              variant="outline"
              className="h-12 w-full border-white/30 bg-transparent text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <MessageCircle className="mr-2 h-5 w-5" /> Falar com o gerente
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
