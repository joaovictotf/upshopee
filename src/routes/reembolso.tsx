import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  User,
  Mail,
  KeyRound,
  IdCard,
  MessageSquare,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export const Route = createFileRoute("/reembolso")({ component: ReembolsoPage });

const FONT_STACK = "Inter, Arial, Helvetica, sans-serif";

// ─── Validation ─────────────────────────────────────────────────────────────

type FieldName = "nome" | "email" | "pix" | "documento" | "motivo";

type FormValues = Record<FieldName, string>;

const EMPTY_FORM: FormValues = {
  nome: "",
  email: "",
  pix: "",
  documento: "",
  motivo: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for a field, or null when valid. */
function validateField(name: FieldName, value: string): string | null {
  const v = value.trim();
  switch (name) {
    case "nome":
      if (!v) return "Informe seu nome completo.";
      if (v.length < 3) return "O nome deve ter ao menos 3 caracteres.";
      return null;
    case "email":
      if (!v) return "Informe seu e-mail.";
      if (!EMAIL_RE.test(v)) return "Digite um e-mail válido.";
      return null;
    case "pix":
      if (!v) return "Informe sua chave PIX.";
      return null;
    case "documento": {
      if (!v) return "Informe seu CPF ou CNPJ.";
      const digits = v.replace(/\D/g, "");
      if (digits.length !== 11 && digits.length !== 14)
        return "CPF deve ter 11 dígitos ou CNPJ 14 dígitos.";
      return null;
    }
    case "motivo": {
      if (!v) return "Descreva o motivo do reembolso.";
      if (v.length < 10) return "O motivo deve ter ao menos 10 caracteres.";
      return null;
    }
    default:
      return null;
  }
}

function validateAll(values: FormValues): Record<FieldName, string | null> {
  return {
    nome: validateField("nome", values.nome),
    email: validateField("email", values.email),
    pix: validateField("pix", values.pix),
    documento: validateField("documento", values.documento),
    motivo: validateField("motivo", values.motivo),
  };
}

// ─── Field component ──────────────────────────────────────────────────────────

interface FieldProps {
  id: FieldName;
  label: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder: string;
  autoComplete?: string;
  icon: React.ReactNode;
  value: string;
  error: string | null;
  touched: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function Field({
  id,
  label,
  type = "text",
  inputMode,
  placeholder,
  autoComplete,
  icon,
  value,
  error,
  touched,
  disabled,
  onChange,
  onBlur,
}: FieldProps) {
  const showError = touched && !!error;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={
          "h-11 rounded-lg transition-colors " +
          (showError
            ? "border-destructive focus-visible:ring-destructive"
            : "focus-visible:ring-primary")
        }
      />
      <p
        id={errorId}
        role="alert"
        className={
          "text-xs text-destructive transition-all duration-200 " +
          (showError ? "max-h-8 opacity-100" : "max-h-0 overflow-hidden opacity-0")
        }
      >
        {error}
      </p>
    </div>
  );
}

// ─── Textarea field component ───────────────────────────────────────────────

interface TextareaFieldProps {
  id: FieldName;
  label: string;
  placeholder: string;
  rows?: number;
  icon: React.ReactNode;
  value: string;
  error: string | null;
  touched: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function TextareaField({
  id,
  label,
  placeholder,
  rows = 4,
  icon,
  value,
  error,
  touched,
  disabled,
  onChange,
  onBlur,
}: TextareaFieldProps) {
  const showError = touched && !!error;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </Label>
      <Textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={
          "rounded-lg transition-colors " +
          (showError
            ? "border-destructive focus-visible:ring-destructive"
            : "focus-visible:ring-primary")
        }
      />
      <p
        id={errorId}
        role="alert"
        className={
          "text-xs text-destructive transition-all duration-200 " +
          (showError ? "max-h-8 opacity-100" : "max-h-0 overflow-hidden opacity-0")
        }
      >
        {error}
      </p>
    </div>
  );
}

function ReembolsoPage() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    nome: false,
    email: false,
    pix: false,
    documento: false,
    motivo: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const errors = useMemo(() => validateAll(values), [values]);
  const isValid = useMemo(
    () => Object.values(errors).every((e) => e === null),
    [errors],
  );

  const setField = (name: FieldName) => (value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const blurField = (name: FieldName) => () =>
    setTouched((prev) => ({ ...prev, [name]: true }));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ nome: true, email: true, pix: true, documento: true, motivo: true });
    if (!isValid || submitting) return;

    setSubmitting(true);
    // GOLDEN RULE: demo only — no real backend call. Simulate a short request.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
    }, 1200);
  };

  const handleReset = () => {
    setValues(EMPTY_FORM);
    setTouched({ nome: false, email: false, pix: false, documento: false, motivo: false });
    setDone(false);
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-b from-primary/10 via-background to-background px-4 py-10 sm:py-16"
      style={{ fontFamily: FONT_STACK }}
    >
      <div className="mx-auto w-full max-w-lg">
        {/* Hero */}
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Solicitar Reembolso
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            Preencha os dados abaixo e o valor cai direto na sua conta. É rápido,
            seguro e sem burocracia.
          </p>
        </header>

        {/* Card */}
        <Card className="rounded-2xl border-border/70 shadow-xl shadow-primary/5">
          {done ? (
            <SuccessView onReset={handleReset} />
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg">Dados do reembolso</CardTitle>
                <CardDescription>
                  Confirme suas informações para concluir o pedido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form noValidate onSubmit={handleSubmit} className="space-y-5">
                  <Field
                    id="nome"
                    label="Nome completo"
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    icon={<User className="h-4 w-4" />}
                    value={values.nome}
                    error={errors.nome}
                    touched={touched.nome}
                    disabled={submitting}
                    onChange={setField("nome")}
                    onBlur={blurField("nome")}
                  />
                  <Field
                    id="email"
                    label="E-mail"
                    type="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    icon={<Mail className="h-4 w-4" />}
                    value={values.email}
                    error={errors.email}
                    touched={touched.email}
                    disabled={submitting}
                    onChange={setField("email")}
                    onBlur={blurField("email")}
                  />
                  <Field
                    id="pix"
                    label="Chave PIX"
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                    icon={<KeyRound className="h-4 w-4" />}
                    value={values.pix}
                    error={errors.pix}
                    touched={touched.pix}
                    disabled={submitting}
                    onChange={setField("pix")}
                    onBlur={blurField("pix")}
                  />
                  <Field
                    id="documento"
                    label="CPF ou CNPJ"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    icon={<IdCard className="h-4 w-4" />}
                    value={values.documento}
                    error={errors.documento}
                    touched={touched.documento}
                    disabled={submitting}
                    onChange={setField("documento")}
                    onBlur={blurField("documento")}
                  />
                  <TextareaField
                    id="motivo"
                    label="Motivo do reembolso"
                    placeholder="Explique o motivo da sua solicitação de reembolso"
                    icon={<MessageSquare className="h-4 w-4" />}
                    value={values.motivo}
                    error={errors.motivo}
                    touched={touched.motivo}
                    disabled={submitting}
                    onChange={setField("motivo")}
                    onBlur={blurField("motivo")}
                  />

                  <Button
                    type="submit"
                    disabled={!isValid || submitting}
                    className="h-12 w-full rounded-xl text-base font-semibold shadow-md shadow-primary/30 transition-all hover:shadow-lg hover:shadow-primary/40 active:scale-[0.99]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar pedido de reembolso"
                    )}
                  </Button>

                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Seus dados são usados apenas para processar o reembolso.
                  </p>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Success view ─────────────────────────────────────────────────────────────

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <CardContent className="flex flex-col items-center px-6 py-12 text-center">
      <style>{`
        @keyframes _rb_pop {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes _rb_ring {
          0%   { transform: scale(0.6); opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes _rb_fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rb-pop  { animation: _rb_pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .rb-ring { animation: _rb_ring 1.1s ease-out 0.2s both; }
        .rb-fade { animation: _rb_fade 0.5s ease 0.25s both; }
      `}</style>

      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-emerald-500/30 rb-ring" />
        <span className="rb-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="h-11 w-11" />
        </span>
      </div>

      <h2 className="rb-fade text-xl font-bold tracking-tight text-foreground">
        Pedido enviado!
      </h2>
      <p className="rb-fade mt-2 max-w-sm text-base text-muted-foreground">
        Recebemos sua solicitação de reembolso. Pedimos até 5 dias úteis para o processamento. O valor será creditado na sua conta dentro desse prazo.
      </p>

      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        className="rb-fade mt-7 text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Fazer outra solicitação
      </Button>
    </CardContent>
  );
}
