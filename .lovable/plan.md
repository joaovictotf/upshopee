## Plano: Pop-up obrigatório do canal oficial no WhatsApp

### O que será feito
Adicionar um pop-up modal que aparece em **todas as páginas** (login, dashboard, landing, etc.) **sempre que o usuário acessar ou recarregar o site**, sem salvamento de estado.

### Implementação

1. **Novo componente** `src/components/WhatsAppChannelPopup.tsx`
   - Estado interno `useState(true)` — aberto por padrão ao montar.
   - **Sem `localStorage`**, `sessionStorage` ou qualquer persistência.
   - Título: "Entre no canal oficial dos alunos"
   - Mensagem descritiva conforme solicitado.
   - Botão principal: "Entrar no WhatsApp" — abre `https://whatsapp.com/channel/0029VbDG7Jz8kyyR7N8HFE41` em nova aba.
   - Botão secundário: "Fechar" — apenas fecha o modal.
   - Overlay com backdrop-blur, centralizado, responsivo (mobile e desktop).
   - Cores do design system da ShopSync (card, primary, bordas, etc.).

2. **Integração** em `src/routes/__root.tsx`
   - Renderizar `<WhatsAppChannelPopup />` dentro de `RootComponent`, após `<Outlet />`.
   - Não interfere em autenticação, rotas, carregamentos ou outros componentes.

### Escopo preservado
- Nenhuma alteração em login, dashboard, pagamentos, estado global, rotas ou server functions.
- Apenas adição do componente e sua inclusão no root layout.
