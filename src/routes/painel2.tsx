/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /painel2  (demonstração local, por aparelho)
  ═══════════════════════════════════════════════════════════════
  Rota do pacote aprovado `src/painel/` (ShopeePanel + demo-store +
  catalog + painel.css). Este arquivo é só a casca: portão de admin e
  montagem do componente.

  · CONVIVE com /painel, que continua existindo e intocada. As duas
    páginas guardam números em localStorage e os formatos são
    incompatíveis (a /painel grava reais com decimal, o pacote grava
    centavos inteiros), então cada uma tem a SUA chave:
      /painel  → upshopee_painel_demo_v1
      /painel2 → upshopee_painel2_demo_v1   (src/painel/demo-store.ts)
    Dividir a chave faria uma zerar os dados da outra a cada visita,
    sem erro visível. Não apontar as duas para a mesma chave;

  · o portão é o MESMO de /dashboard (e o mesmo que a /painel usa):
    papel vem do estado da aplicação, nunca de e-mail resolvido aqui;

  · o catálogo é o real (src/lib/mock/affiliate-products.ts). Nome,
    imagem, preço e porcentagem de comissão vêm de lá — nunca
    duplicados nem inventados. O adaptador src/painel/catalog.ts lê
    esses campos direto do array;

  · nada aqui fala com o Supabase. As tabelas panel_daily_records,
    panel_product_stats e a RPC panel_apply_demo_sale seguem dormentes.

  NÚMEROS DE DEMONSTRAÇÃO. Nada nesta página é saldo, comissão real ou
  saque (Regra de Ouro §1 do CLAUDE.md).
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useApp } from "../lib/state";
import { affiliateProducts } from "../lib/mock/affiliate-products";
import ShopeePanel from "../painel/ShopeePanel";

/* ══════════════════════════════════════════════════════════════
   GATE — mesmo padrão de src/routes/dashboard.tsx e src/routes/painel.tsx
   ══════════════════════════════════════════════════════════════ */

function Painel2Gate() {
  const { user, authReady, isAdmin } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!isAdmin) navigate({ to: "/dashboard/produtos" });
  }, [authReady, user, isAdmin, navigate]);

  if (!authReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user || !isAdmin) return null;
  return <ShopeePanel catalogSource={affiliateProducts} />;
}

export const Route = createFileRoute("/painel2")({ component: Painel2Gate });
