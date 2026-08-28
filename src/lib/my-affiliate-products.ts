/* ═══════════════════════════════════════════════════════════════════
   Produtos afiliados do usuário — leitura compartilhada de
   public.user_affiliate_products
   ═══════════════════════════════════════════════════════════════════
   Duas telas precisam da mesma lista:
     · /dashboard/produtos  — a aba "Meus produtos";
     · /dashboard/video-ia  — a etapa 1, onde o usuário escolhe o produto
       que vira o tema do vídeo.

   As duas leem DAQUI, com a mesma query. Se cada tela montasse a própria
   consulta, uma acabaria discordando da outra sobre o que o usuário
   afiliou. Mesmo motivo do lib/class-booking.ts. */

import { supabase } from "../integrations/supabase/client";
import { affiliateProducts, type AffiliateProduct } from "./mock/affiliate-products";

/** Linha de public.user_affiliate_products. Quem grava é a RPC
 *  record_affiliate_click, no clique em "Afiliar na Shopee". */
export type MyAffiliateRow = {
  product_n: number;
  last_clicked_at: string;
  click_count: number;
};

/** Resolve o `product_n` gravado no banco de volta para o produto do catálogo.
 *  O banco guarda só o número — nome, preço e imagem vivem no bundle. */
export const affiliateByN = new Map<number, AffiliateProduct>(
  affiliateProducts.map((p) => [p.n, p]),
);

/** Linhas do usuário, clique mais recente primeiro.
 *
 *  Devolve `[]` em qualquer falha, nunca lança: nas duas telas esta lista é
 *  complemento, e uma queda de rede não pode derrubar a página junto. */
export async function fetchMyAffiliateRows(userId: string): Promise<MyAffiliateRow[]> {
  try {
    const { data, error } = (await (supabase
      .from("user_affiliate_products" as never)
      .select("product_n, last_clicked_at, click_count")
      // O filtro por user_id é obrigatório mesmo com RLS: a policy de admin
      // permite SELECT em tudo, e sem isto a lista do admin viria com as
      // linhas dos outros usuários misturadas.
      .eq("user_id", userId)
      .order("last_clicked_at", { ascending: false }) as unknown)) as {
      data: MyAffiliateRow[] | null;
      error: { message: string } | null;
    };
    if (error) {
      console.warn("[meus-produtos] falha ao carregar:", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("[meus-produtos] falha ao carregar:", err);
    return [];
  }
}

/** Linhas do banco → produtos do catálogo, preservando a ordem recebida.
 *  Um `n` que não existe mais no catálogo é descartado em silêncio: o
 *  catálogo é regerado por script e pode encolher. */
export function rowsToAffiliateProducts(rows: MyAffiliateRow[] | null): AffiliateProduct[] {
  return (rows ?? [])
    .map((row) => affiliateByN.get(row.product_n))
    .filter((p): p is AffiliateProduct => !!p);
}
