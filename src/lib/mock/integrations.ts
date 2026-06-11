export type Integration = {
  id: string;
  name: string;
  logo: string;
  description: string;
  status:
    | "Disponível para conexão"
    | "Conectando..."
    | "Conexão solicitada"
    | "Em análise"
    | "Ativo"
    | "Conexão em análise"
    | "Conexão validada"
    | "Conexão recusada";
  color: string;
  buttonLabel: string;
  steps: string[];
};

export const integrations: Integration[] = [
  {
    id: "shopee",
    name: "Shopee",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
    description: "Conecte sua conta Shopee para enviar produtos, anúncios e configurações de venda.",
    status: "Disponível para conexão",
    color: "#EE4D2D",
    buttonLabel: "Conectar conta Shopee",
    steps: [
      "Conectando com a conta Shopee ativa no navegador...",
      "Validando permissões da sua loja Shopee...",
      "Preparando envio de produtos para configuração...",
      "Sincronizando anúncios e fornecedores...",
      "Configurando ambiente da loja...",
      "Finalizando conexão com a Shopee...",
    ],
  },
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/16/Mercado_Livre_wordmark_%28Portuguese_version%29.svg",
    description: "Prepare sua operação para sincronizar anúncios e acompanhar oportunidades de venda.",
    status: "Disponível para conexão",
    color: "#FFE600",
    buttonLabel: "Conectar conta Mercado Livre",
    steps: [
      "Conectando com a conta Mercado Livre ativa no navegador...",
      "Validando permissões da sua conta...",
      "Preparando sincronização de anúncios...",
      "Configurando ambiente de vendas...",
      "Ajustando integrações de pagamento...",
      "Finalizando conexão com o Mercado Livre...",
    ],
  },
  {
    id: "shein",
    name: "Shein",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Shein_Logo_2017.svg",
    description: "Conecte sua conta para preparar a integração de produtos e canais de venda.",
    status: "Disponível para conexão",
    color: "#000000",
    buttonLabel: "Conectar conta Shein",
    steps: [
      "Conectando com a conta Shein ativa no navegador...",
      "Validando permissões da sua conta...",
      "Preparando integração de produtos...",
      "Configurando ambiente de venda...",
      "Sincronizando catálogo inicial...",
      "Finalizando conexão com a Shein...",
    ],
  },
];