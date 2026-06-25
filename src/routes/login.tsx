import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "../lib/state";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary/15 via-card to-background border-r border-border">
        <div className="flex items-center gap-2">
          <img src="/brand/shopesync-logo.png" alt="UpShopee" className="h-10 w-10 object-contain" />
          <span className="font-bold text-lg">UpShopee</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Venda mais com um painel feito para operar.</h2>
          <p className="mt-3 text-muted-foreground">Conecte Shopee, Mercado Livre e Shein, encontre produtos validados e envie direto para sua loja.</p>
        </div>
        <div className="text-xs text-muted-foreground">© UpShopee · Painel do vendedor</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await login(email, password);
            if (!r.ok) {
              if (r.pending) { navigate({ to: "/conta-em-analise" }); return; }
              if (r.blocked) { navigate({ to: "/pagamento-bloqueado" }); return; }
              toast.error(r.error || "Não foi possível entrar.");
              return;
            }
            if (r.passwordReset) { navigate({ to: "/redefinir-senha" }); return; }
            navigate({ to: "/dashboard" });
          }}
          className="w-full max-w-sm space-y-5"
        >
          <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <img src="/brand/shopesync-logo.png" alt="UpShopee" className="h-16 w-16 object-contain lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight">Entre na sua conta UpShopee</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gerencie produtos, fornecedores, precificação e vendas em um só painel.</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required />
            </div>
          </div>
          <Button type="submit" className="w-full">Entrar</Button>
          <Link to="/register" className="block w-full">
            <Button type="button" variant="outline" className="w-full">Criar conta</Button>
          </Link>
        </form>
      </div>
    </div>
  );
}