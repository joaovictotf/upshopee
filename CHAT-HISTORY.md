# Resumo do Chat — Vídeo IA (ShopSync)

## O que é o projeto
ShopSync é um SaaS dashboard pra afiliados da Shopee. O usuário é o Vinicius (dono). Estamos construindo a página **Vídeo IA** — uma ferramenta de 7 passos onde o usuário seleciona um produto, escolhe estilo, e uma IA (Gemini) gera roteiro + prompt final pra criar vídeos profissionais.

## Cronologia do chat

### 1. Primeiro prompt (diagnóstico completo)
O Vinicius pediu um prompt único pro Claude Code diagnosticar e consertar TUDO da página Vídeo IA. Eu gerei um prompt grande com Partes A-D, usando agentes paralelos.

### 2. Diagnóstico executado
3 agentes rodaram em paralelo:
- TypeScript: 1 erro em dashboard.index.tsx, 0 erros em video-ia
- Dev server: HTTP 200 em /dashboard/video-ia
- Route tree: rota registrada
- Sidebar: entrada "Vídeo IA" existe
- Supabase bucket: video-project-images existe
- RLS policies: 3 policies (SELECT/INSERT/DELETE)
- Build: npm run build passa

### 3. Correções aplicadas (commit 2e7d935)
- Continue button: sempre visível/habilitado
- Upload imagem: opcional (badge "Opcional")
- Navegação: todos 7 passos sem bloqueio
- Steps 4-7 já existem no código

### 4. Deploy da Edge Function
- Comando `supabase secrets set` deu erro de formato → corrigido com aspas
- Comando `supabase functions deploy` falhou → arquivo existia mas tinha import quebrado de `../_shared/cors.ts`
- Edge Function original usava `import { serve } from "https://deno.land/std@0.208.0/http/server.ts"` e `import { corsHeaders } from "../_shared/cors.ts"`

### 5. Edge Function reescrita (self-contained)
Eu reescrevi o arquivo `supabase/functions/generate-video-script/index.ts`:
- Removeu imports externos (serve, cors.ts)
- Virou Deno.serve() nativo
- CORS inline
- STYLE_LABELS, TONE_LABELS, VOICE_LABELS mapeados
- buildPrompt usa TODOS os campos do produto + estilo
- Fallback buildFallback caso Gemini falhe
- Deploy OK

### 6. Timeout no frontend
Steps 5-6 travavam sem feedback. Adicionei AbortController com 35s timeout no handleGenerate e handleRegenerate. Script Python (fix_timeout.py) aplicou as mudanças.

### 7. Problema atual (NÃO RESOLVIDO AINDA)
**O que o Vinicius quer:**
- Step 7 NÃO pode abrir o site do Gemini (remove window.open)
- O prompt final (final_prompt) deve vir em INGLÊS usando TODAS as escolhas do usuário
- TUDO fica dentro do site — zero redirects
- A chave GEMINI_API_KEY já está configurada como secret no Supabase

**O que precisa ser feito:**
1. Edge Function: campo `final_prompt` gerado em INGLÊS (os outros campos continuam em PT)
2. Frontend Step 7: remover handleCopyAndOpen, trocar por handleCopyFinalPrompt (só copia, sem abrir site)
3. Frontend Step 7: reescrever UI — "Prompt pronto para uso!", botão Copiar, sem redirect
4. Frontend Step 6: adicionar campo editável pro "Prompt final em inglês"

## Arquivos relevantes
- `src/routes/dashboard.video-ia.tsx` — página principal (~1270 linhas)
- `supabase/functions/generate-video-script/index.ts` — Edge Function
- Supabase project: `ndawyrqzqhzbyjdmkdge`
- Secret configurado: `GEMINI_API_KEY`

## Comandos úteis
- Deploy Edge Function: `~\scoop\shims\supabase.exe functions deploy generate-video-script --no-verify-jwt`
- Set secret: `~\scoop\shims\supabase.exe secrets set GEMINI_API_KEY="chave"`
- Build: `npm run build`
- Commit/push: `git add . && git commit -m "..." && git push origin main`
- Claude Code: `claude --skip-permissions` (sem flag --ultracode, o modo ativa por palavra-chave no prompt)

## O que o Vinicius espera de mim agora
Que eu pare de gerar prompts pro Claude Code e FAÇA o trabalho eu mesmo:
- Editar os 2 arquivos diretamente
- Resolver a parada do Step 7 (remover redirect, prompt em inglês)
- Não ficar enrolando com prompts gigantes
