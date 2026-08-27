/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /ofertas5
  ═══════════════════════════════════════════════════════════════
  Página do DONO.

  Markup, CSS e comportamento vivem em
  src/components/Ofertas5Landing.tsx, compartilhados com a outra
  rota. Este arquivo existe só para dizer PARA ONDE o botão de
  compra aponta.

  Checkouts SEM o parâmetro `code` — a venda é do dono. Se um
  `code` aparecer aqui, a comissão vai para outra pessoa.

  Os links abaixo são texto intocável: não reordenar parâmetros,
  não url-encodar, não "limpar". Clicar em comprar vai direto para
  o checkout — não há modal de Pix/cartão e não há link IronPay.
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute } from "@tanstack/react-router";
import { Ofertas5Landing, type Ofertas5LandingConfig } from "../components/Ofertas5Landing";

const CONFIG: Ofertas5LandingConfig = {
  checkouts: {
    mensal:
      "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=Q7TO6PU",
    vitalicio:
      "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=4XWIBWR",
  },
};

export const Route = createFileRoute("/ofertas5")({
  component: () => <Ofertas5Landing config={CONFIG} />,
});
