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
];