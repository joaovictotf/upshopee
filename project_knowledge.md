# Conhecimento do Projeto ShopeSync (sync-shopeev2)

Este documento contém uma análise detalhada e completa da arquitetura, funcionalidades, regras de negócio e fluxo de dados do projeto **ShopeSync**. Ele serve como uma base de conhecimento definitiva para guiar modificações futuras e garantir o entendimento completo da plataforma por qualquer agente.

---

## 1. Visão Geral & Objetivo do Projeto
O **ShopeSync** é uma plataforma SaaS B2B onde revendedores (usuários) conectam suas contas de marketplaces (atualmente focado na **Shopee**), cadastram ou importam produtos de catálogos de fornecedores nacionais (localizados em hubs logísticos como SP e RJ), simulam e impulsionam vendas e geram comissões sobre essas transações. 

A plataforma possui painéis distintos para **Usuários Comuns** (revendedores) e **Administradores** (que controlam validações, adicionam comissões manuais, bloqueiam pagamentos e gerenciam as campanhas de impulsionamento).

---

## 2. Stack Tecnológica
*   **Frontend**: React (v19), TypeScript, Vite, TanStack Router (roteamento baseado em arquivos), Recharts (gráficos), Lucide React (ícones), Sonner (notificações toast).
*   **Estilização**: TailwindCSS (v4) integrado com folhas de estilo personalizadas em `src/styles.css` (para efeitos como neon, glassmorphism e animações customizadas).
*   **Backend & Banco de Dados**: Supabase (PostgreSQL) para autenticação de usuários, banco de dados persistente, realtime (via Postgres Changes subscriptions) e funções RPC.
*   **State Management**: Contexto centralizado do React em `src/lib/state.tsx` (`AppProvider`), que gerencia o estado global, sincronizações locais com o localStorage e comunicação em tempo real com o banco de dados.

---

## 3. Arquitetura de Roteamento (TanStack Router)
Embora o arquivo `src/routeTree.gen.ts` possua um comentário indicando ser gerado automaticamente, **ele é mantido manualmente neste projeto**. Qualquer rota nova adicionada em `src/routes/` precisa ser registrada manualmente dentro das interfaces e mapeamentos de `src/routeTree.gen.ts`.

### Rotas Disponíveis (`src/routes/`)
1.  **`/` (Index)**: Tela de entrada inicial (página de pouso simplificada ou redirecionamento).
2.  **`/login`**: Autenticação de usuários.
3.  **`/register`**: Registro de novos usuários (contas novas entram em status `pending` e aguardam validação de administradores).
4.  **`/conta-em-analise`**: Rota para onde usuários pendentes de validação são direcionados.
5.  **`/pagamento-bloqueado`**: Rota para onde usuários com status de pagamento bloqueado (`blocked_payment`) são redirecionados.
6.  **`/dashboard/` (Index do Painel)**: Resumo geral das estatísticas (vendas, receita, comissão, conversão) com gráficos de evolução temporal e feed de atividades.
7.  **`/dashboard/produtos`**: Catálogo geral de produtos divididos por categorias (contém as coleções especiais de Dia dos Namorados e Copa do Mundo 2026).
8.  **`/dashboard/meus-produtos`**: Exibe os produtos que o usuário importou do catálogo geral para sua própria loja.
9.  **`/dashboard/vendas-clientes`**: Listagem detalhada das vendas geradas (reais, automáticas ou via robô), exibindo progresso de envio e dados fictícios do comprador.
10. **`/dashboard/conectar-contas`**: Fluxo para conectar a loja do usuário com o marketplace (Shopee).
11. **`/dashboard/precificacao`**: Calculadora de preços para definir margens de lucro, custos logísticos, taxas de marketplace e comissões.
12. **`/dashboard/grupos`**: Acesso aos grupos de divulgação.
13. **`/dashboard/robo-divulgador`**: Robô de divulgação automatizada para gerar tráfego e vendas simuladas.
14. **`/dashboard/tutoriais`**: Vídeo obrigatório de onboard integrado via Vimeo.
15. **`/dashboard/validar-cadastros`**: Painel do Administrador para validar novos usuários, conexões de marketplace, aprovação de produtos e comissões.
16. **`/dashboard/adicionar-adms`**: Painel exclusivo para o administrador criar ou revogar acessos administrativos a outros usuários.
17. **`/dashboard/configuracoes`**: Configurações de perfil do usuário.

---

## 4. Estrutura do Banco de Dados & Supabase
A integração com o Supabase é feita em `src/integrations/supabase/client.ts`. As principais tabelas e funções são:

### Tabelas Principais
*   **`profiles`**: Dados cadastrais dos usuários.
    *   Campos: `user_id` (UUID), `full_name`, `email`, `phone`, `approval_status` (valores: `pending`, `approved`, `rejected`, `blocked_payment`), `created_at`, `approved_at`, `approved_by`.
*   **`user_roles`**: Permissões/Papéis de acesso.
    *   Campos: `user_id` (UUID), `role` (valores: `admin`, `presentation_admin`).
*   **`user_marketplace_connections`**: Status das conexões com marketplaces por usuário.
    *   Campos: `user_id`, `marketplace` (atualmente `shopee`), `status` (`pending_validation`, `approved`, `rejected`), `requested_at`, `validated_at`.
*   **`user_products`**: Produtos salvos pelos usuários na nuvem para que o administrador possa validá-los.
    *   Campos: `id` (UUID), `user_id`, `local_id` (ID gerado no front), `product_id` (ID do catálogo), `name`, `image`, `category`, `marketplaces` (array), `supplier_name`, `supplier_cost`, `recommended_price`, `estimated_commission`, `status`, `current_step`, `validation_status` (`pending_validation`, `approved`, `rejected`).
*   **`sales_orders`**: Pedidos de vendas gerados.
    *   Campos: `id`, `user_id`, `product_local_id`, `product_name`, `product_image`, `marketplace`, `supplier_name`, `supplier_location`, `customer_name`, `customer_email_masked`, `customer_phone_masked`, `customer_location`, `sale_price`, `supplier_cost`, `marketplace_fee`, `operational_cost`, `commission`, `created_at`, `source` (ex: `gdm_presentation_data`).
*   **`boost_campaigns`**: Campanhas de impulsionamento ativadas.
*   **`boost_simulated_events`**: Eventos simulados de comissão agendados pelo boost.
*   **`dashboard_lightning_events`**: Registros de cliques no "Botão Raio" de comissão expressa do administrador.
*   **`withdrawal_requests`**: Solicitações de saques PIX enviadas pelos usuários.

### Funções RPC Relevantes chamadas via Supabase Client:
*   `approve_user`, `reject_user`, `block_user_payment`, `unblock_user_payment`
*   `validate_marketplace_connection`, `reject_marketplace_connection`
*   `validate_user_product`, `validate_all_pending_products`, `validate_user_pending_products`
*   `admin_create_demo_sale_order`: Adiciona uma comissão manual vinculada a um produto validado.
*   `admin_bulk_demo_commission_shopee`: Adiciona comissão em lote para todos os usuários qualificados.
*   `create_withdrawal_request`: Cria uma requisição de saque (impede saques caso a conta tenha menos de 30 dias de criação).
*   `record_lightning_click`: Registra cliques rápidos no botão raio.
*   `grant_presentation_admin`, `revoke_presentation_admin`
*   `create_robo_sale_order`: Registra um novo pedido de venda a partir do Robô Divulgador diretamente na tabela `sales_orders` para usuários autenticados comuns.

---

## 5. Gerenciamento de Estado Central (`src/lib/state.tsx`)
O arquivo `state.tsx` concentra a maior parte da lógica de sincronização do aplicativo. Suas principais responsabilidades são:

### 5.1 Controle de Acesso e Perfis Administrativos
*   **Administradores nativos**: Definidos de forma estática pelo e-mail contido no array `ADMIN_EMAILS = ["victor@shopesync.com", "rikelme@shopsync.com"]`.
*   **Função `isAdmin`**: Retorna verdadeiro se o e-mail do usuário logado corresponder aos e-mails de admin configurados ou se o usuário possuir a role `admin` no banco de dados.
*   **Presentation Admin**: Role `presentation_admin` que possui acesso parcial de leitura aos painéis, sem permissão de alteração em massa no banco de dados.
*   **Bypass de Validação para Admins**: Produtos salvos por contas de administradores são automaticamente marcados como `"approved"`, ignorando o fluxo de validação obrigatório dos usuários comuns.

### 5.2 Fluxo de Realtime Postgres Subscriptions
O `state.tsx` estabelece canais de escuta ativa no Supabase para sincronizar a interface do usuário em tempo real sem necessidade de recarregar a página:
*   `sales_orders` -> Atualiza a lista de pedidos no dashboard e no painel de vendas.
*   `profiles` -> Atualiza dados cadastrais e altera dinamicamente o status de bloqueio por pagamento.
*   `user_products` -> Sincroniza o status de aprovação de produtos.
*   `dashboard_lightning_events` -> Sincroniza o total acumulado do botão raio.
*   `user_marketplace_connections` -> Sincroniza as conexões com o marketplace.

### 5.3 Sistema de Venda Automática (Auto-Sale)
Os usuários comuns recebem vendas simuladas de forma automática para demonstrar a operação da loja:
*   **Condições**: O usuário precisa ter produtos importados em "Meus Produtos" que tenham sido **aprovados explicitamente pelo administrador** (`productValidationStatus === "approved"`).
*   **Atraso Inicial**: A primeira venda ocorre no mínimo 5 horas (`READY_DELAY_MS`) após o produto estar pronto na loja.
*   **Frequência**: O intervalo entre as vendas é de aproximadamente 5 horas (`AUTO_SALE_INTERVAL_MS`).
*   **Valor da comissão**: Escolhido aleatoriamente a partir da lista `REGULAR_COMMISSION_POOL = [12.9, 15.4, 18.7, 22.3, 24.9, 27.5, 29.9]`.
*   **Regra de Exclusão**: Administradores **não** recebem vendas automáticas para evitar poluição visual de testes.

### 5.4 Preenchimento de Vendas de Demonstração (GDM / Presentation Admin)
Para fins de apresentação, quando um administrador ou presentation admin faz login, o sistema injeta ordens determinísticas falsas criadas em tempo de execução via `buildGdmPresentationOrders()`.
*   Esses dados **não** são salvos no Supabase (permanecem apenas em memória local).
*   Eles acumulam lucros exatos de **R$ 58.435,70 (últimos 7 dias)** e **R$ 233.742,80 (últimos 30 dias)** para preencher os gráficos e impressionar na demonstração do produto.
*   As vendas simuladas utilizam dados da lista estática `GDM_PRODUCTS` e clientes da lista `GDM_CUSTOMERS`.

---

## 6. Funcionalidades Detalhadas

### 6.1 Robô Divulgador (`src/routes/dashboard.robo-divulgador.tsx`)
Ferramenta que simula a divulgação de links em canais sociais para tráfego orgânico.
*   **Créditos**: Cada conta inicia com **10.000 créditos** de divulgação salvos no localStorage no formato `shopesync.robo.credits.v3.{email}`.
*   **Canais**: Usuário pode alternar entre "Grupos de WhatsApp", "Lista de Contatos" e "Grupos do Facebook".
*   **Consumo**: Cada venda simulada bem-sucedida consome entre **30 e 50 créditos** (`CREDITS_MIN` e `CREDITS_MAX`).
*   **Efeito Visual**: Exibe animações contínuas de postagens fictícias no log de atividades (mensagens variam a cada 4 a 9 segundos).
*   **Persistência em Banco de Dados**: Quando o robô de um usuário comum gera uma venda, ele consome créditos e dispara as funções `addSalesOrderForProduct` ou `triggerDemoSale`. Se o produto tiver um `remoteId` (UUID do banco de dados), a aplicação faz uma chamada para o RPC `create_robo_sale_order`, inserindo o pedido com status `'Preparando produto'` e a comissão real do produto diretamente na tabela `sales_orders` do Supabase.
*   **Realtime Sync**: Uma vez inserido no banco de dados, o canal em tempo real do Supabase detecta a inserção e atualiza automaticamente a listagem de comissões, saldo de vendas e o painel de "Vendas / Clientes", garantindo consistência entre sessões e dispositivos.
*   **Mock para Admins**: Contas administrativas iniciam com um histórico pré-populado de 15 registros (vendas e mensagens de atividades) simulados no mount para demonstrar atividade prévia.

### 6.2 Impulsionar Vendas (Boost)
Campanhas de tráfego pago que aceleram as vendas.
*   **Planos disponíveis**:
    *   **Início**: R$ 47,00 (Gera até 3x de retorno simulado).
    *   **Aceleração**: R$ 97,00 (Gera até 4x de retorno simulado).
    *   **Escala**: R$ 197,00 (Gera até 5x de retorno simulado).
    *   **Máximo**: R$ 497,00 (Gera até 6x de retorno simulado).
*   **Fluxo**: O administrador cria a campanha via `adminCreateBoostCampaign`. Ela gera eventos agendados que são liberados a cada 30 segundos no cliente através da função de banco de dados `release_due_boost_events`.

### 6.3 Coleção Especial da Copa do Mundo 2026
Campanha promocional baseada na Copa do Mundo 2026.
*   **Efeito Visual**: Elementos da Copa possuem bordas decoradas com um gradiente dinâmico verde/amarelo em movimento contínuo (através da classe CSS `copa-glow` no arquivo `src/styles.css`).
*   **Catálogo**: Contém 10 produtos específicos da Copa (como camisas femininas, meias, kit torcedor, squeeze de alumínio, mini bola e bola tamanho oficial) com margens otimizadas.
*   **CopaPopup**: Modal que é disparado para o usuário apresentando os novos produtos da Copa. Ele é exibido apenas uma vez por conta, controlado pela chave de localStorage `shopesync.copa_new_products_v1`.

### 6.4 Grupos de Divulgação (`src/routes/dashboard.grupos.tsx`)
*   **Restrição de Acesso**: Para usuários normais, os botões e links dos grupos exibem uma notificação toast ("Grupos atualizando... por favor aguarde") e **não abrem nenhum link**.
*   **Acesso Admin**: Apenas contas de administradores conseguem abrir os links reais dos grupos de divulgação do WhatsApp.

### 6.5 Painel de Validar Cadastros (Admin Panel)
*   Visualiza e filtra todos os usuários do sistema por status de aprovação.
*   **Validação em Massa**: Contém botões de validação instantânea:
    *   "Liberar todos os produtos": Aprova todos os cadastros pendentes na tabela `user_products`.
    *   "Validar todos os marketplaces": Aprova conexões pendentes na tabela `user_marketplace_connections`.
    *   "Aprovar todos os cadastros": Aprova perfis pendentes na tabela `profiles`.
*   **Adicionar Comissões Manuais**: O administrador seleciona o e-mail do usuário, o produto aprovado (exclusivo para produtos já em status pronto para venda) e atribui uma comissão de até R$ 30,00.
*   **Bloqueio de Pagamento**: Permite bloquear temporariamente o acesso do usuário (`blocked_payment`), redirecionando-o para a tela de bloqueio e impedindo o uso do dashboard.

---

## 7. Chaves do LocalStorage & SessionStorage

### LocalStorage
*   `shopesync.user`: Armazena dados simplificados do usuário logado (nome, e-mail).
*   `shopesync.userdata.{email}`: Cache offline das ordens e produtos do usuário.
*   `shopesync.selectedMarketplace`: Marketplace selecionado pelo usuário (`shopee`).
*   `shopesync.privacy`: Salva se o modo privacidade está ativo (oculta valores monetários com hash `***`).
*   `shopesync.copa_new_products_v1`: Registra se o usuário já visualizou o modal de produtos da Copa.
*   `shopesync.robo.credits.v3.{email}`: Guarda a quantidade de créditos do robô do usuário (inicializa em 10.000).
*   `shopesync.vendashoje.{email}`: Dados temporários de vendas efetuadas hoje.
*   `shopesync.commissionhist.{email}`: Histórico de comissões acumuladas por dia.
*   `shopesync.lastautosale.{email}`: Timestamp do último evento de venda automática regular.

### SessionStorage
*   `shopesync_admin_demo_connections`: Conexões simuladas da conta de administrador na sessão atual.
*   `shopesync.blocked_payment`: Flag que indica se o usuário logado está com acesso suspenso por pagamento.

---

## 8. Regras Críticas para Desenvolvimento Futuro
1.  **Mantendo Relação com Banco de Dados**: Ações que geram vendas e comissões para usuários comuns devem, idealmente, bater no Supabase (tabela `sales_orders`) para que fiquem salvas entre acessos de diferentes dispositivos. Ações de admin e modo demonstração (GDM) utilizam dados em memória.
2.  **Limite de Comissões**: Vendas automáticas e comissões manuais aplicadas a usuários **não devem ultrapassar R$ 30,00 por item** para preservar os limites acordados e regras do pool de vendas.
3.  **Segurança dos Grupos**: Em nenhuma circunstância a restrição dos links de grupos de WhatsApp deve ser removida para usuários comuns. Apenas administradores podem visualizá-los e acessá-los.
4.  **Cuidado com a Route Tree**: Ao criar novas páginas nas rotas, lembre-se de configurar e atualizar manualmente o arquivo `src/routeTree.gen.ts`, declarando os imports, IDs e dependências de rotas-filhas corretamente.
