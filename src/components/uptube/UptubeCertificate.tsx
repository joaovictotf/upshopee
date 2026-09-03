/* ═══════════════════════════════════════════════════════════════════
   Certificado da trilha Uptube — desenhado em <canvas>, baixado em PNG
   ═══════════════════════════════════════════════════════════════════

   Canvas em vez de biblioteca de PDF: zero dependência nova, e o
   resultado é um arquivo que a pessoa abre, imprime e manda no
   WhatsApp sem plugin nenhum.

   SOBRE AS CORES DAQUI. A regra do projeto é não escrever cor na mão e
   usar os tokens de styles.css — e ela vale para tudo que é INTERFACE.
   Isto não é interface: é uma imagem exportada, que sai do site e vai
   ser vista fora dele, muitas vezes impressa. Um certificado com fundo
   #0A0A0C porque a pessoa estava no tema escuro gastaria a tinta da
   impressora e ficaria ilegível no papel. Então o documento tem papel
   claro fixo, sempre, nos dois temas. O que É lido dos tokens é a cor
   da marca (--accent), para o laranja do certificado nunca divergir do
   laranja do site. */

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Download } from "lucide-react";

/* Resolução do arquivo gerado. 1600x1131 é proporção A4 deitado: imprime
   sem borda estranha e ainda fica nítido na tela de um celular. */
const CANVAS_W = 1600;
const CANVAS_H = 1131;

/* Cores do DOCUMENTO (ver a nota no topo do arquivo). */
const PAPER = "#FFFFFF";
const PAPER_EDGE = "#FBF8F6";
const INK = "#17171A";
const INK_SOFT = "#6E6E76";
const HAIRLINE = "#E4E4E0";

/** Fallback do laranja da marca, igual ao --accent de styles.css. Só é usado
 *  se getComputedStyle não devolver nada (SSR, canvas fora do documento). */
const ACCENT_FALLBACK = "#F4541E";

function readAccent(): string {
  if (typeof window === "undefined") return ACCENT_FALLBACK;
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return v || ACCENT_FALLBACK;
  } catch {
    return ACCENT_FALLBACK;
  }
}

/** DD/MM/AAAA no fuso de São Paulo — o dia que vale é o do aluno, não o do
 *  navegador dele nem o UTC do servidor. */
export function formatCertificateDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    // Ambiente sem base de fusos: melhor a data local do que nenhuma.
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()}`;
  }
}

/** Diminui a fonte até o texto caber na largura. Nome comprido é o caso
 *  normal em português ("Maria Fernanda de Albuquerque Nascimento"), não a
 *  exceção — sem isto ele vazaria para fora da moldura. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  minPx: number,
  family: string,
  weight: string,
): number {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minPx && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawCertificate(canvas: HTMLCanvasElement, name: string, dateLabel: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const accent = readAccent();
  const sans = `Inter, "Segoe UI", system-ui, -apple-system, sans-serif`;
  const display = `Sora, Inter, "Segoe UI", system-ui, sans-serif`;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Papel, com um degradê muito leve para não ficar chapado.
  const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  bg.addColorStop(0, PAPER);
  bg.addColorStop(1, PAPER_EDGE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Faixa superior da marca.
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, CANVAS_W, 18);

  // Moldura dupla.
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, CANVAS_W - 108, CANVAS_H - 108);
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.strokeRect(70, 70, CANVAS_W - 140, CANVAS_H - 140);

  ctx.textAlign = "center";
  const cx = CANVAS_W / 2;

  // Marca.
  ctx.fillStyle = accent;
  ctx.font = `700 30px ${sans}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("UPSHOPEE", cx, 190);
  ctx.letterSpacing = "0px";

  // Título.
  ctx.fillStyle = INK;
  ctx.font = `700 74px ${display}`;
  ctx.fillText("Certificado de Conclusão", cx, 300);

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 30px ${sans}`;
  ctx.fillText("Trilha Uptube", cx, 352);

  // Filete.
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 90, 392);
  ctx.lineTo(cx + 90, 392);
  ctx.stroke();

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 32px ${sans}`;
  ctx.fillText("Certificamos que", cx, 476);

  // O nome — o que a pessoa vai procurar primeiro.
  const nameSize = fitFont(ctx, name, CANVAS_W - 340, 86, 40, display, "700");
  ctx.fillStyle = INK;
  ctx.font = `700 ${nameSize}px ${display}`;
  ctx.fillText(name, cx, 580);

  // Sublinhado do nome, largura do próprio nome.
  const nameWidth = Math.min(ctx.measureText(name).width + 80, CANVAS_W - 300);
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - nameWidth / 2, 616);
  ctx.lineTo(cx + nameWidth / 2, 616);
  ctx.stroke();

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 30px ${sans}`;
  ctx.fillText("concluiu as 5 aulas da Trilha Uptube e está", cx, 690);
  ctx.fillText("apto a aplicar as estratégias da plataforma.", cx, 736);

  // Data.
  ctx.fillStyle = INK;
  ctx.font = `600 30px ${sans}`;
  ctx.fillText(`Concluído em ${dateLabel}`, cx, 830);

  // Rodapé.
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 260, 930);
  ctx.lineTo(cx + 260, 930);
  ctx.stroke();

  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 24px ${sans}`;
  ctx.fillText("UpShopee · Plataforma de afiliados e sellers", cx, 972);
}

/** Vira "maria-fernanda" para o nome do arquivo baixado. */
function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      // Faixa U+0300–U+036F: as marcas diacríticas que o NFD acabou de separar
      // das letras. É o passo que transforma "José" em "jose" no nome do
      // arquivo. Os dois caracteres dentro dos colchetes são combinantes e
      // por isso parecem "vazios" no editor — não apague achando que é sujeira.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "aluno"
  );
}

interface UptubeCertificateProps {
  /** Já resolvido pelo chamador, com o mesmo critério do DashboardShell. */
  name: string;
  /** Quando a trilha foi concluída (o completed_at mais recente). */
  completedAt: Date;
}

export function UptubeCertificate({ name, completedAt }: UptubeCertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const dateLabel = formatCertificateDate(completedAt);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* As fontes do projeto (Inter, Sora) podem ainda não estar prontas na
       primeira pintura, e aí o canvas cairia no fallback do sistema — o
       certificado sairia com outra tipografia. document.fonts.ready resolve
       na hora quando já carregaram. */
    let cancelled = false;
    const paint = () => {
      if (!cancelled && canvasRef.current) drawCertificate(canvasRef.current, name, dateLabel);
    };
    paint();
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(paint);
    }
    return () => {
      cancelled = true;
    };
  }, [name, dateLabel]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    canvas.toBlob((blob) => {
      setDownloading(false);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-uptube-${slugify(name)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Libera o blob depois do clique — revogar na hora cancela o download
      // em alguns navegadores.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, "image/png");
  }, [name]);

  return (
    <div>
      {/* Prévia. width/height do canvas são a resolução do ARQUIVO; a classe
          w-full só o encolhe na tela — o PNG sai sempre em 1600x1131. */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block h-auto w-full"
          aria-label={`Certificado de conclusão da Trilha Uptube em nome de ${name}`}
        />
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-60 sm:w-auto"
      >
        {downloading ? <Award className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        Baixar certificado em PNG
      </button>
    </div>
  );
}
