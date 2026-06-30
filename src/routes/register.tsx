import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, UserPlus } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        data: { full_name: name.trim() },
      },
    });

    if (signUpError) {
      const msg = signUpError.message || "";
      toast.error(
        /registered|exists/i.test(msg)
          ? "Já existe uma conta com este e-mail."
          : msg || "Não foi possível criar a conta.",
      );
      setSubmitting(false);
      return;
    }

    if (signUpData.user) {
      // Approval is handled server-side by the handle_new_user() trigger
      // (every new user is created 'approved'). The previous client-side
      // UPDATE here was a no-op: it filtered .eq("id", ...) but the PK is
      // user_id, and RLS only allows admins to UPDATE profiles. Removed.
      await supabase.auth.signOut();
    }

    setSubmitting(false);
    toast.success("Cadastro realizado! Faça login para acessar sua conta.");
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-[#FFF8F5]">
      {/* Left branding panel — hidden on mobile */}
      <div className="relative hidden w-[480px] flex-shrink-0 flex-col justify-between overflow-hidden bg-[#EE4D2D] p-12 lg:flex">
        {/* Background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
              backgroundSize: "60px 60px, 80px 80px",
            }}
          />
        </div>

        <div className="relative z-10">
          <img src="/brand/logo.png" alt="UpShopee" className="h-16 w-auto object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Venda mais com um
            <br />
            painel feito para operar.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Conecte Shopee, Mercado Livre e Shein, encontre produtos validados e
            envie direto para sua loja.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-white/50">
            &copy; UpShopee &middot; Painel do vendedor
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <img src="/brand/logo.png" alt="UpShopee" className="mb-8 mx-auto block h-10 w-auto object-contain drop-shadow-sm lg:hidden" onError={(e)=>{e.currentTarget.style.display='none'}} />

          <Card className="border-0 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.06]">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Crie sua conta
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Comece a gerenciar produtos, fornecedores e vendas em um so painel.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-sm font-medium text-foreground"
                  >
                    Nome
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    required
                    className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm transition-shadow focus-visible:ring-[#EE4D2D]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    className="h-11 rounded-lg border-gray-200 bg-white px-4 text-sm transition-shadow focus-visible:ring-[#EE4D2D]/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha"
                      autoComplete="new-password"
                      required
                      className="h-11 rounded-lg border-gray-200 bg-white pr-10 text-sm transition-shadow focus-visible:ring-[#EE4D2D]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-lg bg-[#EE4D2D] text-sm font-semibold text-white shadow-sm shadow-[#EE4D2D]/25 transition-all hover:bg-[#EE4D2D]/90 hover:shadow-md hover:shadow-[#EE4D2D]/30 active:scale-[0.98]"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Criando conta...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Criar conta
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#EE4D2D] hover:text-[#EE4D2D]/80 transition-colors"
                  >
                    Entrar
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
