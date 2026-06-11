Vou alterar apenas `src/routes/dashboard.index.tsx`, no componente `DashboardHome` e seus filhos já existentes.

Plano:

1. **Forçar Arial no valor principal**
   - No componente `ShopeeHeroPanel`, ajustar somente o elemento que renderiza o número grande e o prefixo `R$`.
   - Remover/evitar qualquer classe ou estilo numérico que possa manter aparência arredondada/customizada, preservando tamanho, cor, posição e layout.
   - Aplicar inline exatamente com `fontFamily: 'Arial, Helvetica, sans-serif'`, `fontWeight: 800`, `letterSpacing: '-1px'` e `lineHeight: 1` no valor grande.

2. **Sincronizar Top 5 com o período selecionado**
   - Manter o estado único `range` do Dashboard, usado pelos botões “Hoje”, “7 Dias”, “30 Dias”.
   - Corrigir o filtro de período para:
     - Hoje: início do dia atual até agora.
     - 7 Dias: agora menos 7 dias até agora.
     - 30 Dias: agora menos 30 dias até agora.
   - Recalcular o Top 5 com `useMemo` a partir de `data.salesOrders`, agrupando por `productId`, somando unidades e `salePrice`, ordenando por unidades e depois faturamento.
   - Usar dados reais do pedido (`productName`, `productImage`, `salePrice`, `saleDate`) com fallback para `meusProdutos` apenas para completar nome/imagem se necessário, não como lista estática.
   - Garantir o título exato: `Top 5 produtos mais vendidos`.

3. **Escopo preservado**
   - Não tocar em autenticação, admin, Validar Cadastros, Meus Produtos, Vendas / Clientes, landing page, tema global ou outros componentes.
   - Ao final, reportar exatamente o arquivo/componente que renderiza o dashboard e onde cada correção foi feita.