import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useApp } from "../lib/state";

function DashboardGate() {
  const { user, authReady, accountStatus, isAdmin } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (!authReady) return;
    let blockedFlag = false;
    try { blockedFlag = sessionStorage.getItem("shopesync.blocked_payment") === "1"; } catch {}
    if (!user) {
      if (blockedFlag) navigate({ to: "/pagamento-bloqueado" });
      else navigate({ to: "/login" });
      return;
    }
    if (!isAdmin && (accountStatus === "blocked_payment" || blockedFlag)) {
      navigate({ to: "/pagamento-bloqueado" });
    }
  }, [authReady, user, navigate, accountStatus, isAdmin]);
  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user) return null;
  if (!isAdmin && accountStatus === "blocked_payment") return null;
  return <Outlet />;
}

export const Route = createFileRoute("/dashboard")({ component: DashboardGate });
