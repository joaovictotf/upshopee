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
  { id: "s1", name: "CD Rio de Janeiro", location: "Rio de Janeiro/RJ", reputation: 4.8, dispatchTime: "1 a 2 dias úteis", baseStock: 612, shipping: "Envio nacional" },
  { id: "s2", name: "CD São Paulo", location: "São Paulo/SP", reputation: 4.9, dispatchTime: "1 dia útil", baseStock: 420, shipping: "Envio nacional" },
];
