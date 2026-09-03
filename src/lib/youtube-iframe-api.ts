/* ═══════════════════════════════════════════════════════════════════
   YouTube IFrame Player API — carregador ÚNICO e global
   ═══════════════════════════════════════════════════════════════════

   POR QUE ISTO É UM MÓDULO SEPARADO, E NÃO UM useEffect NO PLAYER

   `window.onYouTubeIframeAPIReady` é UM callback global, não uma lista. A
   API do YouTube chama esse nome exatamente uma vez, quando o script
   termina de carregar. Se duas montagens do player escreverem nele, a
   segunda sobrescreve a primeira e o player que registrou primeiro nunca
   é inicializado — fica um retângulo preto parado, sem erro no console.

   O mesmo vale para o <script>: injetar duas vezes faz o navegador baixar
   e executar a API duas vezes, e a segunda execução pode disparar o
   callback antes de o primeiro player existir.

   Então a injeção acontece UMA vez por carregamento de página, memoizada
   na Promise abaixo. Quem quiser o player espera a mesma Promise. Numa SPA
   isto significa: a primeira abertura baixa o script, todas as seguintes
   resolvem na hora.

   Também trata o caso de a API JÁ estar carregada quando o componente
   monta (voltar para a página, HMR, outro componente ter carregado antes):
   `window.YT.Player` já existe e a Promise resolve sem tocar em nada. */

const SCRIPT_ID = "youtube-iframe-api";
const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

/** Só o que este projeto usa. Evita depender de @types/youtube. */
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  /** allowSeekAhead=true deixa o player pedir ao servidor um trecho ainda não bufferizado. */
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

export interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

export interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (e: YTPlayerEvent) => void;
    onStateChange?: (e: YTPlayerEvent) => void;
    onError?: (e: YTPlayerEvent) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement | string, options: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  // Memoização: é ESTA linha que garante uma injeção só, por toda a vida da
  // página. Todas as montagens seguintes recebem a mesma Promise.
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("YouTube IFrame API só carrega no navegador."));
      return;
    }

    // Já carregada. Testo `YT.Player` e não só `YT`: o objeto YT passa a
    // existir ANTES de a API estar pronta, e nesse intervalo o construtor
    // ainda é undefined.
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    /* Encadeia em vez de sobrescrever. Hoje ninguém mais define este
       callback no projeto, mas um script de terceiros (pixel, chat) pode
       passar a definir — e sobrescrever calado é justamente o bug que este
       módulo existe para evitar. */
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        /* handler de terceiros quebrado não pode impedir o nosso player */
      }
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API carregou sem window.YT.Player."));
    };

    // O <script> pode já ter sido injetado (ex.: duas abas do mesmo bundle,
    // ou este módulo recarregado por HMR mantendo o DOM). Nesse caso só
    // esperamos o callback acima.
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onerror = () => {
        // Permite nova tentativa numa próxima abertura (rede caiu, bloqueador
        // de anúncio). Sem isto a Promise rejeitada ficaria memoizada para
        // sempre e o player nunca mais carregaria nesta aba.
        apiPromise = null;
        reject(new Error("Não foi possível carregar o player do YouTube."));
      };
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

/** mm:ss, ou h:mm:ss quando passa de uma hora. */
export function formatPlayerTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
