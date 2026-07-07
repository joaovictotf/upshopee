/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /ofertas3  (Pix-only, no modal, no cartão, 6 FAQ items)
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute } from "@tanstack/react-router";
import { OfertasLanding, type LandingConfig } from "../components/OfertasLanding";

const CONFIG: LandingConfig = {
  checkouts: {
    mensal: {
      pix: "https://go.ironpayapp.com.br/zbu0e9tvo9?affh=g2yncp6zjd",
      cartao: "", // not used — direct Pix only
    },
    vitalicio: {
      pix: "https://go.ironpayapp.com.br/wqqa7uihfe?affh=0iglp1sned",
      cartao: "", // not used — direct Pix only
    },
  },
  hasPaymentModal: false,
  showCartaoOption: false,
};

export const Route = createFileRoute("/ofertas3")({
  component: () => <OfertasLanding config={CONFIG} />,
});
