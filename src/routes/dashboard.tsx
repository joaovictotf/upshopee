import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "../lib/state";
import { BankInfoGate } from "../components/BankInfoGate";
import { hasBankInfo } from "../lib/bankinfo";

function DashboardGate() {
  const { user, authReady, accountStatus, isAdmin } = useApp();
  const navigate = useNavigate();
  const [bankInfoDone, setBankInfoDone] = useState(false);
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
  // Re-evaluate banking info whenever the logged-in user changes.
  useEffect(() => {
    setBankInfoDone(isAdmin || hasBankInfo(user?.email));
  }, [user?.email, isAdmin]);
  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user) return null;
  if (!isAdmin && accountStatus === "blocked_payment") return null;
  if (!bankInfoDone) {
    return <BankInfoGate email={user.email} onComplete={() => setBankInfoDone(true)} />;
  }
  return <Outlet />;
}

export const Route = createFileRoute("/dashboard")({ component: DashboardGate });
