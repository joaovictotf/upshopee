export type Supplier = {
  id: string;
  name: string;
  location: string;
  reputation: number;
  dispatchTime: string;
  baseStock: number;
  shipping: string;
};

export const suppliers: Supplier[] = [
  { id: "s1", name: "RioStock Distribuidora", location: "Rio de Janeiro/RJ", reputation: 4.8, dispatchTime: "1 a 2 dias úteis", baseStock: 420, shipping: "Envio nacional" },
  { id: "s2", name: "SP Prime Atacado", location: "São Paulo/SP", reputation: 4.9, dispatchTime: "1 dia útil", baseStock: 612, shipping: "Envio nacional" },
  { id: "s3", name: "Minas Distribuição", location: "Belo Horizonte/MG", reputation: 4.7, dispatchTime: "2 a 3 dias úteis", baseStock: 350, shipping: "Envio nacional" },
  { id: "s4", name: "Sul Atacadista", location: "Curitiba/PR", reputation: 4.6, dispatchTime: "2 dias úteis", baseStock: 280, shipping: "Sul e Sudeste" },
  { id: "s5", name: "Nordeste Supply", location: "Recife/PE", reputation: 4.5, dispatchTime: "3 a 4 dias úteis", baseStock: 195, shipping: "Nordeste" },
  { id: "s6", name: "Centro-Oeste Log", location: "Goiânia/GO", reputation: 4.6, dispatchTime: "2 a 3 dias úteis", baseStock: 230, shipping: "Centro-Oeste e Norte" },
];