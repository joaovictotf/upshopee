-- ═══════════════════════════════════════════════════════════════════════════
-- Trilha Uptube — catálogo dos 5 vídeos e o progresso de quem assiste
-- Migration: 20260903120000_uptube_progress
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POR QUE ISTO EXISTE
-- ───────────────────
-- src/routes/dashboard.aulas.tsx lista hoje 23 aulas FICTÍCIAS e todo clique
-- dispara um toast "Aulas em breve!". Os 5 vídeos reais já existem. A próxima
-- tarefa reescreve aquela página; este arquivo só constrói o que ela vai ler.
--
-- O progresso NÃO pode viver no localStorage. É a pendência #6 do CLAUDE.md
-- ("fonte de verdade dividida"): quem troca de navegador perde o que fez. Aqui
-- o problema é pior que perder dado, porque a trilha LIBERA UMA RECOMPENSA —
-- assistir no celular e resgatar no desktop tem que funcionar. Então o
-- progresso é linha de tabela, com o usuário no PK.
--
-- E como libera recompensa, o progresso é um número que vale algo. Todo número
-- que vale algo neste projeto tem que ser escrito pelo SERVIDOR — a mesma
-- lição de 20260814120000 (teto de venda automática saiu do client) e de
-- 20260817120000 (preço da aula saiu do client). Ver a seção 3.
--
-- ORDEM DENTRO DO ARQUIVO IMPORTA:
--   1. uptube_videos — o catálogo e a ORDEM. Precisa existir antes, porque
--      uptube_progress tem FK para ela e as duas RPCs leem daqui.
--   2. uptube_progress.
--   3. RLS + GRANTs — a trava de escrita, que é o ponto principal do arquivo.
--   4. RPC uptube_save_progress — onde mora a regra anti-pulo.
--   5. RPC uptube_my_trail — onde mora o portão sequencial.
--   6. Asserção de privilégio: o arquivo confere a si mesmo e aborta se as
--      travas da seção 3 não estiverem valendo.
-- Tudo aplica em uma transação só (o `supabase db push` embrulha o arquivo).
--
-- Este arquivo é SÓ SQL. Nenhum .tsx foi alterado — a página de aulas
-- continua com as 23 aulas fictícias até a próxima tarefa.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.uptube_videos — O CATÁLOGO E A ORDEM
-- ═══════════════════════════════════════════════════════════════════════════
-- `position` é o portão: o vídeo N só abre quando o N-1 foi concluído. Por
-- isso é NOT NULL UNIQUE — duas linhas na mesma posição deixariam o portão
-- ambíguo, e o portão é o que segura a recompensa.
--
-- `duration_sec` nasce NULL de propósito. Ninguém digita a duração aqui: ela é
-- CONGELADA na primeira vez que um player real informa, dentro de
-- uptube_save_progress (seção 4). O CHECK repete os limites da RPC para que
-- nem um UPDATE manual do admin consiga gravar uma duração absurda.

CREATE TABLE IF NOT EXISTS public.uptube_videos (
  id           text    PRIMARY KEY,
  position     int     NOT NULL UNIQUE,
  youtube_id   text    NOT NULL,
  title        text    NOT NULL,
  duration_sec int,
  active       boolean NOT NULL DEFAULT true,

  CONSTRAINT uptube_videos_position_positive
    CHECK (position >= 1),

  -- O id do YouTube tem EXATAMENTE 11 caracteres do alfabeto [A-Za-z0-9_-].
  -- Este CHECK não é decoração: o id do v4 COMEÇA COM UNDERSCORE
  -- ('_CVuK8daIWA'). Qualquer ferramenta, planilha ou refactor que "limpe" o
  -- underscore da frente produz uma string de 10 caracteres, e o YouTube passa
  -- a servir OUTRO vídeo, ou nenhum, sem erro nenhum do nosso lado. Com o
  -- CHECK, o banco recusa antes de a tela mentir.
  CONSTRAINT uptube_videos_youtube_id_format
    CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),

  CONSTRAINT uptube_videos_duration_sane
    CHECK (duration_sec IS NULL OR duration_sec BETWEEN 30 AND 14400)
);

COMMENT ON TABLE public.uptube_videos IS
  'Catálogo da trilha Uptube. Fonte única da ORDEM dos vídeos — o client nunca decide o que está liberado.';
COMMENT ON COLUMN public.uptube_videos.position IS
  'Posição sequencial, 1..N. O portão de uptube_my_trail depende dela. MANTER CONTÍGUA entre as linhas ativas — ver o aviso em uptube_my_trail.';
COMMENT ON COLUMN public.uptube_videos.youtube_id IS
  'Id de 11 caracteres do YouTube. String opaca: nao normalizar, nao trimar, nao url-encodar. O id do v4 comeca com underscore.';
COMMENT ON COLUMN public.uptube_videos.duration_sec IS
  'NULL até o primeiro player real informar. Congelado por uptube_save_progress na primeira observação válida (30..14400s) e NUNCA reescrito depois.';
COMMENT ON COLUMN public.uptube_videos.active IS
  'false esconde o vídeo da trilha e faz uptube_save_progress recusar. Preferir desativar a deletar — DELETE é bloqueado por FK se já houver progresso.';

-- Os 5 vídeos reais. Títulos são copy de UI em português — NÃO TRADUZIR.
--
-- ON CONFLICT (id) DO NOTHING, e não DO UPDATE, por um motivo concreto: reaplicar
-- o arquivo não pode zerar o duration_sec que já foi congelado em produção nem
-- desfazer um ajuste de título feito depois. Se um youtube_id precisar ser
-- corrigido algum dia, é UPDATE explícito em migration nova, revisado — não de
-- carona num re-seed.
INSERT INTO public.uptube_videos (id, position, youtube_id, title, active) VALUES
  ('v1', 1, 'ePDQyBYwW3c', 'Ensinando escolher os produtos', true),
  ('v2', 2, 'uWfBmMlbTAc', 'Estratégia bônus',               true),
  ('v3', 3, 'stqWgGAMQdA', 'Grupos de Divulgação',           true),
  ('v4', 4, '_CVuK8daIWA', 'Como gerar vídeos na UpShopee',  true),
  ('v5', 5, 'kwXXrTcKE6E', 'Geração de vídeo - parte 2',     true)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. public.uptube_progress — O PROGRESSO
-- ═══════════════════════════════════════════════════════════════════════════
-- Duas colunas de tempo, porque são duas perguntas diferentes:
--   • furthest_sec — o ponto mais adiantado ALCANÇADO DE FORMA LEGÍTIMA. É o
--     único que decide conclusão. Só cresce, e só dentro do limite de
--     uptube_save_progress.
--   • last_sec — onde retomar. Pode voltar (o usuário rebobinou), e por isso
--     não serve para decidir nada.
--
-- PK (user_id, video_id) faz três trabalhos: uma linha por par, ON CONFLICT
-- alvo da RPC, e índice de leitura da trilha (user_id é a coluna à esquerda,
-- então `WHERE user_id = ?` usa o índice do PK). Não crio índice extra: seria
-- só custo de escrita.

CREATE TABLE IF NOT EXISTS public.uptube_progress (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id     text        NOT NULL REFERENCES public.uptube_videos(id) ON UPDATE CASCADE,
  furthest_sec int         NOT NULL DEFAULT 0,
  last_sec     int         NOT NULL DEFAULT 0,
  completed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, video_id),

  CONSTRAINT uptube_progress_secs_non_negative
    CHECK (furthest_sec >= 0 AND last_sec >= 0),

  -- Invariante do passo 5 da RPC, escrita no banco também: não existe "onde
  -- retomar" à frente do ponto mais adiantado que a pessoa realmente alcançou.
  -- Sem isto, um last_sec inflado seria um caminho lateral para aparentar
  -- progresso que furthest_sec não tem.
  CONSTRAINT uptube_progress_last_within_furthest
    CHECK (last_sec <= furthest_sec)
);

COMMENT ON TABLE public.uptube_progress IS
  'Progresso por usuário e vídeo da trilha Uptube. Escrita SÓ por uptube_save_progress — authenticated e anon não têm INSERT/UPDATE/DELETE aqui.';
COMMENT ON COLUMN public.uptube_progress.furthest_sec IS
  'Ponto mais adiantado alcançado legitimamente. Só cresce, e só até o limite de tempo real decorrido (ver uptube_save_progress). É o único que decide conclusão.';
COMMENT ON COLUMN public.uptube_progress.last_sec IS
  'Onde retomar a reprodução. Pode diminuir (rebobinar). Nunca decide conclusão.';
COMMENT ON COLUMN public.uptube_progress.completed_at IS
  'Marcado quando furthest_sec alcança 95% da duração congelada. Uma vez marcado, NUNCA é limpo — reassistir não desconclui.';
COMMENT ON COLUMN public.uptube_progress.updated_at IS
  'Momento da última gravação. NÃO é enfeite: é o relógio contra o qual o próximo avanço é medido.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS + GRANTs — A TRAVA DE ESCRITA
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta é a armadilha que quase foi para produção em class_bookings, e aqui ela
-- é ainda mais direta.
--
-- Se `authenticated` tiver INSERT ou UPDATE em uptube_progress, qualquer pessoa
-- com o DevTools aberto faz
--     POST /rest/v1/uptube_progress
--     { "video_id": "v5", "furthest_sec": 999999, "completed_at": "now()" }
-- e conclui a trilha inteira em uma requisição. **A RLS não ajuda em nada
-- nesse caso**: a policy "sou eu mesmo" está satisfeita — a linha É dela. RLS
-- responde "de quem é a linha", nunca "esse número é honesto".
--
-- Então a escrita não existe para o client, em nível de privilégio:
--   • GRANT decide se o papel tem o verbo (erro duro: "permission denied").
--   • POLICY decide quais linhas ele enxerga (0 linhas, silencioso).
-- Onde ninguém legítimo precisa do verbo, tiro o GRANT. Assim uma policy larga
-- demais criada por engano no futuro não abre nada sozinha — foi o argumento
-- de 20260823140000, e vale igual aqui.
--
-- Toda escrita passa por uptube_save_progress, que é SECURITY DEFINER e roda
-- como a dona (postgres), enxergando as tabelas sem depender do GRANT de quem
-- chamou.

ALTER TABLE public.uptube_videos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptube_progress ENABLE ROW LEVEL SECURITY;

-- ── uptube_videos ──────────────────────────────────────────────────────────
-- anon não lê o catálogo: a trilha só existe logado. authenticated lê e mais
-- nada — nem INSERT, nem UPDATE, nem DELETE, nem no GRANT nem em policy.
-- Diferente de class_professors (onde o admin também é `authenticated` e
-- precisava manter o verbo), aqui NÃO existe tela de admin editando o
-- catálogo: os 5 vídeos vêm do seed e quem mexer neles mexe por migration ou
-- pela service key. Enquanto for assim, o GRANT mais apertado é o certo.
REVOKE ALL ON TABLE public.uptube_videos FROM anon;
REVOKE ALL ON TABLE public.uptube_videos FROM authenticated;
GRANT  SELECT ON TABLE public.uptube_videos TO authenticated;
GRANT  ALL    ON TABLE public.uptube_videos TO service_role;

DROP POLICY IF EXISTS "Authenticated read active uptube videos" ON public.uptube_videos;
CREATE POLICY "Authenticated read active uptube videos"
  ON public.uptube_videos FOR SELECT TO authenticated
  USING (active);
-- USING (active), não USING (true): o §11 do CLAUDE.md marca USING(true) como
-- suspeito, e aqui nem é preciso — um vídeo desativado não tem por que
-- aparecer para ninguém.

-- ── uptube_progress ────────────────────────────────────────────────────────
-- UMA policy, de SELECT, do dono da linha. Nenhuma de INSERT, UPDATE ou
-- DELETE — a ausência é a decisão, não um esquecimento.
--
-- REVOKE ALL cobre o que a lista do enunciado pedia (INSERT, UPDATE, DELETE,
-- TRUNCATE) e mais REFERENCES, TRIGGER e MAINTAIN, que o
-- `ALTER DEFAULT PRIVILEGES ... GRANT ALL` original do Supabase também dava.
-- Um POST/PATCH/DELETE vindo do PostgREST morre em
-- "permission denied for table uptube_progress" — falha barulhenta, não
-- "0 rows" silencioso.
REVOKE ALL ON TABLE public.uptube_progress FROM anon;
REVOKE ALL ON TABLE public.uptube_progress FROM authenticated;
GRANT  SELECT ON TABLE public.uptube_progress TO authenticated;
GRANT  ALL    ON TABLE public.uptube_progress TO service_role;

DROP POLICY IF EXISTS "Users read own uptube progress" ON public.uptube_progress;
CREATE POLICY "Users read own uptube progress"
  ON public.uptube_progress FOR SELECT TO authenticated
  USING (auth.uid() = uptube_progress.user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPC uptube_save_progress — A REGRA ANTI-PULO
-- ═══════════════════════════════════════════════════════════════════════════
-- Guarda no navegador é quebra-molas: quem abre o DevTools passa por cima.
-- Esta função é a parte que segura de verdade, porque é a ÚNICA porta de
-- escrita que existe (seção 3).
--
-- Duas defesas, contra duas fraudes diferentes:
--
--   (a) MENTIR A POSIÇÃO — "estou no minuto 10" dois segundos após carregar.
--       Defesa: furthest_sec só cresce o tanto de tempo REAL que passou desde
--       a última gravação. Ver o passo 4.
--
--   (b) MENTIR A DURAÇÃO — "este vídeo tem 10 segundos, e eu já vi 10".
--       Defesa: a duração é congelada na primeira observação plausível e
--       depois o parâmetro é simplesmente ignorado. Ver o passo 3.
--
-- ┌─ LIMITE CONHECIDO DA DEFESA (a) — LEIA ANTES DE CONFIAR NELA ───────────┐
-- │ O crédito de avanço é calculado sobre `now() - updated_at`, isto é,     │
-- │ sobre o tempo desde a ÚLTIMA GRAVAÇÃO — não sobre tempo de reprodução.  │
-- │ Logo o crédito ACUMULA enquanto ninguém grava: quem abre a página,      │
-- │ espera 10 minutos parado e só então grava, chega com ~905s de crédito   │
-- │ de uma vez e pode saltar esse tanto.                                    │
-- │                                                                         │
-- │ Na prática isso custa ao trapaceiro ~2/3 da duração do vídeo em tempo   │
-- │ de parede (o fator é 1.5), então continua sendo uma barreira real — mas │
-- │ NÃO é à prova de paciência. Foi implementado exatamente como            │
-- │ especificado, de propósito: mudar a matemática de uma defesa por conta  │
-- │ própria é pior que documentar o limite.                                 │
-- │                                                                         │
-- │ A correção, se um dia valer a pena, é UMA LINHA: pôr um teto no crédito │
-- │     _allowed := LEAST(_allowed, 90);                                    │
-- │ o que obriga a gravar pelo menos a cada 90s para não perder crédito, e  │
-- │ mata a acumulação. Não fiz agora porque muda o contrato que o player    │
-- │ terá que cumprir (frequência mínima de gravação), e o player é a próxima│
-- │ tarefa — a decisão pertence a ela, com o intervalo já definido.         │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.uptube_save_progress(
  p_video_id    text,
  p_current_sec int,
  p_duration_sec int DEFAULT NULL
)
RETURNS TABLE (
  video_id     text,
  duration_sec int,
  furthest_sec int,
  last_sec     int,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- OBRIGATÓRIO, não é preferência de estilo. Os nomes de saída declarados acima
-- (video_id, duration_sec, furthest_sec, last_sec, completed_at) viram
-- variáveis plpgsql com o MESMO nome de colunas reais de uptube_progress. Em
-- todo lugar onde eu escrevo a coluna qualificada (`p.video_id`, `up.last_sec`)
-- não há problema — mas o alvo de `ON CONFLICT (user_id, video_id)` é lido como
-- expressão de índice e NÃO aceita qualificação. Sem esta diretiva a função
-- compila e só quebra em tempo de execução, com
--     42702: column reference "video_id" is ambiguous
-- na primeira gravação de progresso. (Aconteceu: pego na verificação contra
-- produção, antes de qualquer .tsx depender disto.)
--
-- Por que `use_column` é seguro aqui: TODA variável local é prefixada com `_` e
-- todo parâmetro de entrada com `p_`, e não existe coluna com esses prefixos em
-- lugar nenhum do schema. Logo a diretiva só pode afetar os nomes de SAÍDA — que
-- esta função nunca lê, porque devolve tudo por RETURN QUERY (que casa por
-- ordem, não por nome). Mantenha a convenção `_`/`p_` ao mexer aqui.
#variable_conflict use_column
DECLARE
  _uid          uuid;
  _cur          int;
  _duration     int;
  _old_furthest int;
  _old_updated  timestamptz;
  _old_done     timestamptz;
  _allowed      numeric;
  _new_furthest int;
  _new_last     int;
  _new_done     timestamptz;
BEGIN
  -- ── Passo 1: quem é, e o vídeo existe e está ativo ──────────────────────
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF p_video_id IS NULL OR btrim(p_video_id) = '' THEN
    RAISE EXCEPTION 'Vídeo não informado';
  END IF;

  PERFORM 1 FROM public.uptube_videos v
   WHERE v.id = p_video_id AND v.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vídeo indisponível: %', p_video_id;
  END IF;

  -- ── Passo 2: serializa ANTES de ler ─────────────────────────────────────
  -- Sem o lock, duas abas leem o mesmo furthest_sec antigo, as duas calculam o
  -- mesmo crédito e as duas gravam — dobrando o avanço permitido por chamada.
  -- O ON CONFLICT do fim resolveria o conflito de chave, não a fraude.
  -- O lock é por (usuário, vídeo): duas pessoas em vídeos diferentes não se
  -- esperam.
  PERFORM pg_advisory_xact_lock(hashtext(_uid::text || p_video_id));

  -- ── Passo 3: CONGELA A DURAÇÃO ──────────────────────────────────────────
  -- Só grava se ainda está NULL, e só se o valor é plausível (30s a 4h). Uma
  -- vez gravada, nunca mais é reescrita e p_duration_sec passa a ser ignorado.
  --
  -- O `AND duration_sec IS NULL` dentro do WHERE é o que torna isto seguro
  -- entre USUÁRIOS DIFERENTES, que o advisory lock acima não cobre: dois
  -- primeiros espectadores do mesmo vídeo disputam a linha, o segundo espera o
  -- lock de linha do Postgres, reavalia o WHERE depois do commit do primeiro e
  -- atualiza 0 linhas. Quem chega segundo não sobrescreve.
  UPDATE public.uptube_videos v
     SET duration_sec = p_duration_sec
   WHERE v.id = p_video_id
     AND v.duration_sec IS NULL
     AND p_duration_sec IS NOT NULL
     AND p_duration_sec BETWEEN 30 AND 14400;

  -- Lê o valor EFETIVO (congelado antes, agora, ou ainda NULL).
  SELECT v.duration_sec INTO _duration
    FROM public.uptube_videos v
   WHERE v.id = p_video_id;

  -- ── Passo 4: LIMITA O AVANÇO ────────────────────────────────────────────
  SELECT p.furthest_sec, p.updated_at, p.completed_at
    INTO _old_furthest, _old_updated, _old_done
    FROM public.uptube_progress p
   WHERE p.user_id = _uid
     AND p.video_id = p_video_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- Linha nova: nada alcançado ainda, e o crédito mínimo. Quem carrega a
    -- página e imediatamente diz "estou em 10:00" avança ~5 segundos.
    _old_furthest := 0;
    _old_done     := NULL;
    _allowed      := 5;
  ELSE
    -- GREATEST(5, ...) garante o piso mesmo se updated_at estiver no futuro
    -- (relógio, restore de backup): o crédito nunca fica negativo.
    _allowed := GREATEST(
      5,
      FLOOR(EXTRACT(EPOCH FROM (now() - _old_updated)) * 1.5) + 5
    );
  END IF;

  _cur := GREATEST(COALESCE(p_current_sec, 0), 0);

  -- GREATEST(...) primeiro: nunca retrocede. LEAST(...) depois: nunca salta
  -- mais que o crédito.
  _new_furthest := LEAST(
    GREATEST(_old_furthest, _cur),
    _old_furthest + _allowed
  )::int;

  -- ── Passo 5: onde retomar ───────────────────────────────────────────────
  -- Pode voltar, mas não pode passar do ponto legítimo — é a invariante do
  -- CHECK uptube_progress_last_within_furthest.
  _new_last := LEAST(_cur, _new_furthest);

  -- ── Passo 6: conclusão em 95%, e para sempre ────────────────────────────
  -- 95% porque cartela final, creditos e o próprio arredondamento do player
  -- fazem quase ninguém chegar aos 100%. Sem duração congelada não há como
  -- concluir — é isso que impede o vídeo de "acabar" em 10 segundos.
  --
  -- COALESCE mantém o valor antigo: reassistir NÃO desconclui, e a recompensa
  -- não pisca.
  _new_done := _old_done;
  IF _new_done IS NULL
     AND _duration IS NOT NULL
     AND _new_furthest >= FLOOR(_duration * 0.95)
  THEN
    _new_done := now();
  END IF;

  -- ── Passo 7: grava e devolve ────────────────────────────────────────────
  INSERT INTO public.uptube_progress AS up (
    user_id, video_id, furthest_sec, last_sec, completed_at, updated_at
  ) VALUES (
    _uid, p_video_id, _new_furthest, _new_last, _new_done, now()
  )
  ON CONFLICT (user_id, video_id) DO UPDATE
     SET furthest_sec = EXCLUDED.furthest_sec,
         last_sec     = EXCLUDED.last_sec,
         -- Segunda trava do "nunca desconclui", agora no próprio UPDATE: nem
         -- um bug futuro no cálculo acima consegue limpar completed_at.
         completed_at = COALESCE(up.completed_at, EXCLUDED.completed_at),
         updated_at   = EXCLUDED.updated_at
  RETURNING up.furthest_sec, up.last_sec, up.completed_at
       INTO _new_furthest, _new_last, _new_done;

  -- Devolve o que FICOU GRAVADO (via RETURNING), não o que foi calculado: se o
  -- COALESCE do ON CONFLICT preservar um completed_at anterior, é esse que o
  -- player recebe. A duração congelada vai junto porque é a primeira coisa que
  -- o player precisa saber que já não é dele decidir — se ele mandou 10 e
  -- recebeu 843 de volta, o valor dele foi descartado e ele não deve insistir.
  RETURN QUERY
    SELECT p_video_id,
           _duration,
           _new_furthest,
           _new_last,
           _new_done;
END;
$$;

COMMENT ON FUNCTION public.uptube_save_progress(text, int, int) IS
  'Única porta de escrita de uptube_progress. Limita o avanço ao tempo real decorrido, congela a duração na primeira observação válida e conclui em 95%. authenticated não tem INSERT/UPDATE na tabela.';

REVOKE EXECUTE ON FUNCTION public.uptube_save_progress(text, int, int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.uptube_save_progress(text, int, int) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RPC uptube_my_trail — O PORTÃO SEQUENCIAL
-- ═══════════════════════════════════════════════════════════════════════════
-- `unlocked` é calculado AQUI, em SQL, e nunca aceito do client. Mesma razão
-- da seção 3: liberar vídeo é decisão de valor, e decisão de valor não desce
-- para o navegador.
--
-- Vídeo sem linha de progresso volta com ZEROS, não ausente. A página tem que
-- renderizar os 5 numa conta nova, e um LEFT JOIN aqui é mais barato que cinco
-- `?? 0` espalhados na tela.
--
-- ESCOLHA DE DESENHO, para o enunciado ficar respondido: a conclusão da trilha
-- volta como COLUNA `trail_complete` neste mesmo resultado, e NÃO como uma
-- terceira função uptube_trail_complete(). Motivo: a página precisa das duas
-- coisas ao mesmo tempo (lista + certificado), e duas RPCs seriam duas idas ao
-- servidor que podem discordar entre si — a lista chegando de antes da última
-- gravação e o certificado de depois. Uma resposta só não tem esse buraco. O
-- valor repete em todas as linhas; é um booleano, não custa nada.
--
-- ┌─ AVISO: `position` TEM QUE FICAR CONTÍGUA ENTRE OS ATIVOS ──────────────┐
-- │ O portão é literalmente "o vídeo da position - 1 está concluído". Se    │
-- │ alguém marcar active = false num vídeo DO MEIO (digamos o v3), a        │
-- │ position 3 desaparece da lista e o v4 passa a exigir a conclusão de um  │
-- │ vídeo que ninguém consegue nem ver: a trilha TRAVA PARA SEMPRE no v3,   │
-- │ e a recompensa deixa de ser alcançável, sem erro em lugar nenhum.       │
-- │                                                                         │
-- │ Então: desativar o ÚLTIMO é seguro; desativar um do meio exige          │
-- │ renumerar as positions na mesma migration. Se algum dia desativar o do  │
-- │ meio virar rotina, a troca é o EXISTS abaixo por um LAG(completed_at)   │
-- │ OVER (ORDER BY position) sobre a lista de ativos, que ignora buracos.   │
-- │ Deixei o literal porque é o que foi especificado e porque hoje as 5     │
-- │ posições são 1..5 sem buraco.                                           │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.uptube_my_trail()
RETURNS TABLE (
  video_id       text,
  -- ASPAS OBRIGATÓRIAS. `position` é palavra-chave da categoria col_name do
  -- Postgres: serve de nome de COLUNA (por isso uptube_videos.position passa
  -- sem aspas), mas NÃO de nome de parâmetro de função — sem as aspas o
  -- CREATE FUNCTION morre em `syntax error at or near "position"`. Entre
  -- aspas vira identificador comum e o resultado sai com o nome `position`,
  -- que é o que a página vai ler.
  "position"     int,
  youtube_id     text,
  title          text,
  duration_sec   int,
  furthest_sec   int,
  last_sec       int,
  completed_at   timestamptz,
  unlocked       boolean,
  trail_complete boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Nota de implementação: dentro da CTE a posição se chama `pos`, nunca
  -- `position`. RETURN QUERY casa as colunas POR ORDEM, não por nome, então o
  -- resultado sai com os nomes declarados acima. Evitar o identificador
  -- `position` aqui dentro tira do caminho tanto a função POSITION() do SQL
  -- padrão quanto o parâmetro de saída homônimo desta função.
  RETURN QUERY
  WITH tr AS (
    SELECT
      v.id                        AS vid,
      v.position                  AS pos,
      v.youtube_id                AS yt,
      v.title                     AS ttl,
      v.duration_sec              AS dur,
      COALESCE(p.furthest_sec, 0) AS fur,
      COALESCE(p.last_sec, 0)     AS lst,
      p.completed_at              AS done
    FROM public.uptube_videos v
    LEFT JOIN public.uptube_progress p
           ON p.video_id = v.id
          AND p.user_id  = _uid
    WHERE v.active
  )
  SELECT
    t.vid,
    t.pos,
    t.yt,
    t.ttl,
    t.dur,
    t.fur,
    t.lst,
    t.done,
    (
      t.pos = 1
      OR EXISTS (
        SELECT 1 FROM tr prev
         WHERE prev.pos = t.pos - 1
           AND prev.done IS NOT NULL
      )
    ) AS is_unlocked,
    (
      -- Trilha completa = existe pelo menos um vídeo ativo E nenhum ativo sem
      -- conclusão. O primeiro EXISTS não é redundância: sem ele, um catálogo
      -- vazio devolveria "completa" (NOT EXISTS de nada é true) e entregaria o
      -- certificado a quem não assistiu nada.
      EXISTS (SELECT 1 FROM tr)
      AND NOT EXISTS (SELECT 1 FROM tr allv WHERE allv.done IS NULL)
    ) AS is_trail_complete
  FROM tr t
  ORDER BY t.pos;
END;
$$;

COMMENT ON FUNCTION public.uptube_my_trail() IS
  'Trilha Uptube do usuário logado: 5 linhas ordenadas por position, com zeros onde não há progresso. `unlocked` e `trail_complete` são calculados em SQL — o client nunca decide o que está liberado.';

REVOKE EXECUTE ON FUNCTION public.uptube_my_trail() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.uptube_my_trail() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ASSERÇÃO — o arquivo confere as próprias travas
-- ═══════════════════════════════════════════════════════════════════════════
-- A seção 3 é a parte deste arquivo que, se falhar em silêncio, não quebra
-- nada visível: a tela continua funcionando e a trilha fica fraudável. Um
-- `GRANT ALL ... TO authenticated` numa migration futura, ou uma default ACL
-- que volte a ser frouxa, passariam sem ninguém notar.
--
-- Então o arquivo verifica a si mesmo antes de commitar. Roda na MESMA
-- transação do resto: se uma asserção falhar, o `db push` aborta e NADA é
-- criado — melhor não ter a trilha do que ter a trilha aberta.

DO $$
DECLARE
  _tbl  text;
  _priv text;
BEGIN
  FOREACH _tbl IN ARRAY ARRAY['public.uptube_videos', 'public.uptube_progress']
  LOOP
    -- anon: nada, em nenhum verbo.
    FOREACH _priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']
    LOOP
      IF has_table_privilege('anon', _tbl, _priv) THEN
        RAISE EXCEPTION 'FALHA DE TRAVA: anon ainda tem % em %', _priv, _tbl;
      END IF;
    END LOOP;

    -- authenticated: SELECT e mais nada.
    IF NOT has_table_privilege('authenticated', _tbl, 'SELECT') THEN
      RAISE EXCEPTION 'FALHA DE TRAVA: authenticated perdeu SELECT em % — a trilha não carrega', _tbl;
    END IF;

    FOREACH _priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']
    LOOP
      IF has_table_privilege('authenticated', _tbl, _priv) THEN
        RAISE EXCEPTION
          'FALHA DE TRAVA: authenticated tem % em % — a trilha é fraudável por POST direto no PostgREST', _priv, _tbl;
      END IF;
    END LOOP;
  END LOOP;

  -- RLS ligada nas duas.
  IF EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.oid IN ('public.uptube_videos'::regclass, 'public.uptube_progress'::regclass)
       AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: RLS desligada em uptube_videos ou uptube_progress';
  END IF;

  -- uptube_progress não pode ter policy de escrita. A ausência é a proteção;
  -- se alguém adicionar uma, é aqui que aparece.
  IF EXISTS (
    SELECT 1 FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND pol.tablename  = 'uptube_progress'
       AND pol.cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: uptube_progress ganhou policy de escrita — toda escrita tem que passar por uptube_save_progress';
  END IF;

  -- anon não executa as RPCs (o REVOKE ... FROM PUBLIC é o que garante isto,
  -- porque anon é membro de PUBLIC).
  IF has_function_privilege('anon', 'public.uptube_save_progress(text,int,int)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.uptube_my_trail()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: anon executa RPC da trilha';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.uptube_save_progress(text,int,int)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.uptube_my_trail()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: authenticated não executa RPC da trilha — a trilha não funciona';
  END IF;

  -- Os 5 vídeos, com os ids exatos. Um youtube_id trocado serve o vídeo errado
  -- sem erro nenhum; o underscore da frente do v4 é o candidato número 1 a ser
  -- perdido por uma ferramenta que "limpa" strings.
  IF (SELECT count(*) FROM public.uptube_videos WHERE active) <> 5 THEN
    RAISE EXCEPTION 'FALHA DE SEED: a trilha não tem 5 vídeos ativos';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.uptube_videos
     WHERE id = 'v4' AND position = 4 AND youtube_id = '_CVuK8daIWA'
  ) THEN
    RAISE EXCEPTION 'FALHA DE SEED: v4 não está com youtube_id _CVuK8daIWA (underscore inicial incluído)';
  END IF;

  RAISE NOTICE 'Trilha Uptube: travas conferidas — anon sem nada, authenticated só SELECT, escrita só via RPC.';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS — o que fica pendente depois deste arquivo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- • src/routes/dashboard.aulas.tsx continua com as 23 aulas FICTÍCIAS e com o
--   toast "Aulas em breve!". Nada nesta migration é lido por ninguém ainda.
--
-- • src/integrations/supabase/types.ts NÃO foi regenerado — as duas tabelas e
--   as duas RPCs ainda não existem para o TypeScript. Regenerar à mão antes de
--   escrever a página.
--
-- • O player terá que decidir DE QUANTO EM QUANTO TEMPO grava. Essa escolha é
--   o contrato do passo 4: gravar com frequência dá avanço suave; gravar raro
--   acumula crédito (ver a caixa "LIMITE CONHECIDO" na seção 4). Definido o
--   intervalo, considerar o teto de uma linha que está anotado lá.
--
-- • A recompensa/certificado deve olhar `trail_complete` de uptube_my_trail(),
--   nunca contar os `completed_at` no client.
