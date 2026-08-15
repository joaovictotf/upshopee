/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /ofertas2  (modal, affiliate checkout links)
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute } from "@tanstack/react-router";
import { OfertasLanding, type LandingConfig } from "../components/OfertasLanding";

const CONFIG: LandingConfig = {
  checkouts: {
    mensal: {
      pix: "https://go.ironpayapp.com.br/zbu0e9tvo9?affh=fbws7q9iu5",
      cartao: "https://checkout.wiven.com.br/checkout/cmrapl3v50x3h01of62ikqkqv?code=h7jff1l&offer=90DYOXB",
    },
    vitalicio: {
      pix: "https://go.ironpayapp.com.br/wqqa7uihfe?affh=cynvxm3w2g",
      cartao: "https://checkout.wiven.com.br/checkout/cmrapl3v50x3h01of62ikqkqv?code=h7jff1l&offer=RWEG7U6",
    },
  },
  hasPaymentModal: true,
  showCartaoOption: true,
};

export const Route = createFileRoute("/ofertas2")({
  component: () => <OfertasLanding config={CONFIG} />,
});
