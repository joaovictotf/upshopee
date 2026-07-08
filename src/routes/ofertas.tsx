/*
  ═══════════════════════════════════════════════════════════════
  UPSHOPEE — /ofertas  (original — modal, original checkout links)
  ═══════════════════════════════════════════════════════════════
*/
import { createFileRoute } from "@tanstack/react-router";
import { OfertasLanding, type LandingConfig } from "../components/OfertasLanding";

const CONFIG: LandingConfig = {
  checkouts: {
    mensal:    { pix: "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=Q7TO6PU", cartao: "" },
    vitalicio: { pix: "https://checkout.applyfy.com.br/checkout/cmrc5aowy0s7y01ol3jfeb4he?offer=4XWIBWR", cartao: "" },
  },
  hasPaymentModal: false,
  showCartaoOption: false,
};

export const Route = createFileRoute("/ofertas")({
  component: () => <OfertasLanding config={CONFIG} />,
});
