/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /ofertas4  (with Pix/Cartão payment modal)
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute } from "@tanstack/react-router";
import { OfertasLanding, type LandingConfig } from "../components/OfertasLanding";

const CONFIG: LandingConfig = {
  checkouts: {
    mensal: {
      pix: "https://go.ironpayapp.com.br/zbu0e9tvo9",
      cartao: "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=Q7TO6PU",
    },
    vitalicio: {
      pix: "https://go.ironpayapp.com.br/wqqa7uihfe",
      cartao: "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=4XWIBWR",
    },
  },
  hasPaymentModal: true,
  showCartaoOption: true,
};

export const Route = createFileRoute("/ofertas4")({
  component: () => <OfertasLanding config={CONFIG} />,
});
