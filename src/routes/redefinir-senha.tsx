import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "../lib/state";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({ component: PasswordResetPage });

function PasswordResetPage() {
  const { user, passwordResetRequired, clearPasswordResetRequired, authReady } = useApp();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // If no user, redirect to login
  if (authReady && !user) {
    navigate({ to: "/login", replace: true });
    return null;
  }

  // If user doesn't need password reset, go to dashboard
  if (authReady && user && !passwordResetRequired) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message || "Não foi possível atualizar a senha.");
        setLoading(false);
        return;
      }
      await clearPasswordResetRequired();
      toast.success("Senha atualizada com sucesso!");
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Erro ao atualizar a senha. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/15 via-card to-background border-r border-border">
        <div className="flex items-center gap-2">
          <img src="/brand/shopesync-logo.png" alt="UpShopee" className="h-10 w-10 object-contain" />
          <span className="font-bold text-lg">UpShopee</span>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-semibold text-[#EE4D2D]">
            <ShieldCheck className="h-4 w-4" />
            Segurança
          </div>
          <h2 className="mt-4 text-3xl font-bold leading-tight">Proteja sua conta com uma senha pessoal.</h2>
          <p className="mt-3 text-muted-foreground">
            Como parte da migração para a nova plataforma, você precisa definir uma senha pessoal antes de acessar o painel.
            Essa é uma medida de segurança para manter seus dados protegidos.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© UpShopee · Painel do vendedor</div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EE4D2D]/10 lg:hidden">
              <Lock className="h-6 w-6 text-[#EE4D2D]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Criar nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Olá, {user?.name?.split(" ")[0] ?? "usuário"}! Por segurança, defina uma senha pessoal para continuar usando o UpShopee.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Esta etapa é obrigatória e não pode ser ignorada. Sua conta estará protegida após a definição da nova senha.
          </p>
        </form>
      </div>
    </div>
  );
}
