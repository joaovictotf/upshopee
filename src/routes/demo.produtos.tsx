import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DemoShell } from "../components/layout/DemoShell";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/demo/produtos")({ component: DemoProdutos });

const PREVIEW_PRODUCTS = [
  { id: 1, image: "https://down-br.img.susercontent.com/file/br-11134207-820ln-mnqar7zwk26a25",            name: "Álbum Copa 2026" },
  { id: 2, image: "https://static.netshoes.com.br/produtos/camiseta-nike-brasil-i-202223-supporter-masculina/30/2IC-9637-030/2IC-9637-030_zoom1.jpg?ims=544x&ts=1779133644", name: "Camisa Brasil" },
  { id: 3, image: "https://down-br.img.susercontent.com/file/sg-11134201-7rdwm-mdlgl6i0xjq13c",            name: "Fone Bluetooth" },
  { id: 4, image: "https://down-br.img.susercontent.com/file/sg-11134201-7rbm0-lp6med0901yr25",            name: "Mini projetor" },
  { id: 5, image: "https://down-br.img.susercontent.com/file/br-11134207-81z1k-meio8275bls1f0",            name: "Escova secadora" },
  { id: 6, image: "https://down-br.img.susercontent.com/file/4685f70253d971e80facd0aafc4b392b",            name: "Garrafa térmica" },
  { id: 7, image: "https://down-br.img.susercontent.com/file/br-11134207-7qukw-li0urvrlhzzrde",            name: "Figurinhas Copa" },
  { id: 8, image: "https://down-br.img.susercontent.com/file/br-11134207-81z1k-me3hchc8bke836",            name: "Chinelo nuvem" },
  { id: 9, image: "https://down-br.img.susercontent.com/file/sg-11134201-7qvdf-lg8rd2hhbb1x96",            name: "Luminária 3D" },
];

function DemoProdutos() {
  const [privacy, setPrivacy] = useState(false);

  return (
    <DemoShell
      title="Produtos"
      subtitle="Catálogo completo de produtos com alta comissão"
      privacy={privacy}
      onTogglePrivacy={() => setPrivacy((p) => !p)}
    >
      <div className="relative">
        {/* Blurred product grid */}
        <div className="pointer-events-none select-none blur-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {["Todos", "Mais vendidos", "Copa do Mundo 2026", "Alta procura", "Eletrônicos", "Casa", "Moda"].map((cat) => (
              <span
                key={cat}
                className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {PREVIEW_PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex h-36 items-center justify-center bg-white p-3">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <div className="p-3">
                  <div className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{p.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-sm bg-[#EE4D2D] px-1.5 py-0.5 text-[10px] font-bold text-white">MAIS VENDIDO</span>
                    <span className="text-sm font-black text-[#EE4D2D]" style={{ fontFamily: "Arial,sans-serif" }}>
                      R$ ••,••
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-4 max-w-md rounded-2xl border border-[#EE4D2D]/30 bg-background/95 p-8 text-center shadow-2xl backdrop-blur-sm ring-1 ring-[#EE4D2D]/20">
            <div
              className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl"
              style={{ background: "linear-gradient(135deg,#EE4D2D,#F97316)" }}
            >
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-black text-foreground">Disponível após cadastro</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Acesse mais de <strong className="text-foreground">1.000+ produtos validados</strong> com alta comissão, pronto para divulgar com o robô.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/planos"
                className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-bold text-white transition hover:brightness-90"
                style={{ background: "#EE4D2D" }}
              >
                ⚡ Assinar e desbloquear
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Voltar ao Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
