import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <img src="/brand/shopesync-logo.png" alt="ShopeSync" className="h-14 w-14 object-contain" />
          <span className="font-bold">ShopeSync</span>
        </div>

        <form
          onSubmit={async (e) => {
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
          }}
          className="space-y-4"
        >
          <div>
            <h1 className="text-xl font-bold tracking-tight">Crie sua conta ShopeSync</h1>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Criando conta..." : "Criar conta"}
          </Button>

          <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
            Já tenho uma conta
          </Link>
        </form>
      </div>
    </div>
  );
}
