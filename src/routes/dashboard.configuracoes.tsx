import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useApp } from "../lib/state";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Camera, Share2, Zap, Shield } from "lucide-react";
import { toast } from "sonner";
import { loadProfilePhoto, saveProfilePhoto } from "../lib/profilephoto";

export const Route = createFileRoute("/dashboard/configuracoes")({ component: Config });

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function Config() {
  const { user, isAdmin, updateDisplayName } = useApp();
  const [cor, setCor] = useState("Laranja");
  const [notif, setNotif] = useState(true);

  // ═══ PERFIL ═══
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [photo, setPhoto] = useState<string | null>(() => loadProfilePhoto(user?.email));
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    setSavingName(true);
    const res = await updateDisplayName(displayName);
    setSavingName(false);
    if (!res.ok) { toast.error(res.error || "Não foi possível salvar o nome."); return; }
    toast.success("Nome atualizado.");
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file || !user?.email) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error("Formato não aceito. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Arquivo muito grande. Máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      saveProfilePhoto(user.email, dataUrl);
      setPhoto(dataUrl);
      toast.success("Foto de perfil atualizada.");
    };
    reader.onerror = () => toast.error("Não foi possível ler a imagem. Tente outro arquivo.");
    reader.readAsDataURL(file);
  };

  return (
    <DashboardShell title="Configurações" subtitle="Ajuste as preferências da sua operação.">
      <div className="page-enter grid gap-5 lg:grid-cols-2">
        {/* ═══ PERFIL ═══ */}
        <SettingsCard title="Perfil">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--muted-bg)]">
                {photo ? (
                  <img src={photo} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-[var(--muted)]">
                    {(displayName || user?.email || "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-label="Alterar foto de perfil"
                title="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-card)] transition-colors hover:text-[var(--accent)]"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium text-[var(--text)]">Foto de perfil</p>
              <p className="text-[11px] text-[var(--muted)]">JPG, PNG ou WEBP — máx. 2 MB.</p>
            </div>
          </div>

          <FormField label="Nome de exibição">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30"
            />
          </FormField>
          <FormField label="E-mail da conta">
            <Input value={user?.email || ""} disabled className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]" />
          </FormField>
          <div className="pt-1">
            <Button
              variant="outline"
              className="btn-ghost h-10 text-sm"
              onClick={handleSaveName}
              disabled={savingName || !displayName.trim()}
            >
              {savingName ? "Salvando..." : "Salvar nome"}
            </Button>
          </div>
        </SettingsCard>

        {/* ═══ APARÊNCIA E NOTIFICAÇÕES ═══ */}
        <SettingsCard title="Aparência e notificações">
          <FormField label="Cor de destaque">
            <Select value={cor} onValueChange={setCor}>
              <SelectTrigger className="h-10 rounded-[12px] border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] focus-visible:ring-[var(--accent)]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Laranja">Laranja</SelectItem>
                <SelectItem value="Vermelho">Vermelho</SelectItem>
                <SelectItem value="Azul">Azul</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-4">
            <div>
              <div className="text-sm font-medium text-[var(--text)]">Notificações</div>
              <div className="text-xs text-[var(--muted)]">Receba alertas de vendas e comissões.</div>
            </div>
            <Switch checked={notif} onCheckedChange={setNotif} />
          </div>
        </SettingsCard>

        {/* ═══ FINANCEIRO ═══ */}
        <SettingsCard title="Financeiro">
          <p className="text-xs text-[var(--muted)]">
            Solicite o saque das suas comissões. O pedido será enviado para análise da equipe UpShopee.
          </p>
          <div className="rounded-xl bg-[var(--accent-soft)] p-4 ring-1 ring-[var(--accent)]/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                <Shield className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--text)]">
                  O saque ficará disponível após 30 dias de conta ativa.
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  Os valores exibidos podem não representar saldo real disponível para saque.
                </p>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* ═══ ADMINISTRAÇÃO ═══ */}
        {isAdmin && (
          <SettingsCard title="Administração">
            <div className="rounded-xl bg-[var(--accent-soft)] p-4 ring-1 ring-[var(--accent)]/20">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                <Zap className="h-4 w-4" /> Modo demonstração
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Botão de simulação ativo no canto inferior direito.
              </p>
            </div>
          </SettingsCard>
        )}

        {/* ═══ DIVULGAÇÃO ═══ */}
        <SettingsCard title="Divulgação" className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <Share2 className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  Indique a UpShopee e ganhe 70%
                </p>
                <span className="inline-flex items-center rounded-full bg-[var(--muted-bg)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Em breve
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
                Você vai poder indicar a UpShopee para outras pessoas e ganhar 70% de comissão sobre
                cada indicação. Essa função ainda não está disponível — assim que estiver, o link de
                indicação aparece aqui.
              </p>
            </div>
          </div>
        </SettingsCard>

        {/* ═══ FOOTER BUTTON ═══ */}
        <div className="lg:col-span-2 flex justify-end pt-2">
          <Button
            className="btn-primary h-10 px-8 text-sm"
            onClick={() => toast.success("Configurações salvas.")}
          >
            Salvar alterações
          </Button>
        </div>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function SettingsCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-premium space-y-3 p-5 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold text-[var(--text)]" style={{ fontFamily: "'Sora', sans-serif" }}>{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-[var(--muted)]">{label}</Label>
      {children}
    </div>
  );
}
