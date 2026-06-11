import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/conta-em-analise")({ component: ContaEmAnalise });

function ContaEmAnalise() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Sua conta está em análise.</h1>
        <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
          <Clock className="h-3.5 w-3.5 text-primary" /> Prazo máximo: até 30 minutos.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Assim que sua conta for validada, você poderá acessar o painel normalmente.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/login"><Button className="w-full">Tentar entrar novamente</Button></Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Voltar para o início</Link>
        </div>
      </div>
    </div>
  );
}