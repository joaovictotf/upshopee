let _privacy = false;
export const setGlobalPrivacy = (b: boolean) => {
  _privacy = b;
};
export const getGlobalPrivacy = () => _privacy;

export const brl = (v: number) => {
  const s = v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return _privacy ? s.replace(/^R\$\s?/, "") : s;
};

export const num = (v: number) => v.toLocaleString("pt-BR");

export const todayBR = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });