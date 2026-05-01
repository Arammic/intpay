import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { getCardDetailsData, type CardDetailsData } from "@/api/cardDetails";
import { useCurrentUserContext } from "@/lib/currentUserContext";
import {
  uploadProofImage,
  verifyInvoice,
  type VerifyInvoiceData,
} from "@/api/verifyInvoice";
import {
  Loader2,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Snowflake,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Proof upload page. Uploads the receipt to UploadThing (via edge function),
 * then submits to /verify-invoice along with merchant name & description.
 */
export default function ProofUploadPage() {
  const { cardId } = useParams();
  const nav = useNavigate();
  const { userId } = useCurrentUserContext();

  const [card, setCard] = useState<CardDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [merchantName, setMerchantName] = useState("");
  const [description, setDescription] = useState("");
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"" | "uploading" | "verifying">("");
  const [verdict, setVerdict] = useState<VerifyInvoiceData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
    let mounted = true;
    setLoading(true);
    getCardDetailsData(cardId, userId).then((res) => {
      if (!mounted) return;
      if (res.isSucess && res.data) {
        setCard(res.data);
        setDescription(res.data.description ?? "");
        setLoadError(null);
      } else {
        setLoadError(res.error[0] ?? "Failed to load card");
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [cardId, userId]);

  if (!cardId) {
    return (
      <div className="pb-8">
        <PageHeader title="Upload proof" fallback="/cards" />
        <p className="pt-4 text-sm text-muted-foreground">Invalid link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-8">
        <PageHeader title="Upload proof" fallback="/cards" />
        <div className="pt-10 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading card…</span>
        </div>
      </div>
    );
  }

  if (loadError || !card) {
    return (
      <div className="pb-8">
        <PageHeader title="Upload proof" fallback="/cards" />
        <p className="pt-4 text-sm text-destructive">{loadError ?? "Card not found."}</p>
        <Button className="mt-4" onClick={() => nav("/cards")}>Back</Button>
      </div>
    );
  }

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please pick image files only");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageDataUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAt = (index: number) => {
    setImageDataUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!imageDataUrls.length) {
      toast.error("Add at least one proof image");
      return;
    }
    if (!merchantName.trim()) {
      toast.error("Enter the merchant name");
      return;
    }
    setSubmitting(true);
    setVerdict(null);
    setErrorMsg(null);
    try {
      setStage("uploading");
      // Upload only the first image — backend accepts a single imageUrl.
      const imageUrl = await uploadProofImage(imageDataUrls[0]);

      setStage("verifying");
      const res = await verifyInvoice({
        intentId: Number(card.id),
        imageUrl,
        actingUserId: userId,
        description: description.trim() || undefined,
        merchantName: merchantName.trim(),
      });

      if (!res.isSucess || !res.data) {
        const msg = res.error[0] ?? "Verification request failed";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      setVerdict(res.data);
      if (res.data.isMatch) {
        toast.success("AI verified your invoice");
        setTimeout(() => nav(`/cards/${card.id}`), 900);
      } else {
        toast.error("AI rejected the invoice");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setStage("");
      setSubmitting(false);
    }
  };

  const flagChips: { label: string; icon: typeof Lock }[] = verdict
    ? [
        verdict.cardLocked && { label: "Card locked", icon: Lock },
        verdict.isManuallyFrozen && { label: "Manually frozen", icon: Snowflake },
        verdict.isSpendBlocked && { label: "Spend blocked", icon: Ban },
        verdict.isLockedByPendingInvoice && {
          label: "Pending invoice lock",
          icon: Lock,
        },
      ].filter(Boolean) as { label: string; icon: typeof Lock }[]
    : [];

  return (
    <div className="pb-10 -mt-2">
      <PageHeader title="Upload proof" subtitle="AI verification" fallback={`/cards/${card.id}`} />

      <div className="pt-4 space-y-4 max-w-md mx-auto">
        <div className="rounded-xl border border-tertiary/30 bg-tertiary/5 p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-label uppercase text-muted-foreground">Card</span>
            <span className="font-display font-semibold text-foreground">•••• {card.secure.last4}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label uppercase text-muted-foreground">Intent</span>
            <span className="text-foreground italic max-w-[60%] text-right truncate">"{card.description || "—"}"</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-label uppercase text-muted-foreground">Proof type</span>
            <span className="text-foreground">{card.proofName ?? "Receipt / proof"}</span>
          </div>
        </div>

        <div>
          <Label className="font-label text-xs uppercase text-muted-foreground">Merchant name</Label>
          <Input
            placeholder="e.g. Whole Foods"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="font-label text-xs uppercase text-muted-foreground">Description</Label>
          <Textarea
            placeholder="What was this purchase for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 resize-none"
            rows={2}
          />
        </div>

        <div>
          <Label className="font-label text-xs uppercase text-muted-foreground">Proof image</Label>
          <div className="mt-1 space-y-2">
            {imageDataUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {imageDataUrls.map((url, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full max-h-40 object-contain bg-surface" />
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border bg-surface/40 hover:border-primary/50 transition-base p-4 flex flex-col items-center gap-1 text-muted-foreground"
            >
              <ImageIcon className="h-7 w-7" />
              <p className="text-sm font-label">
                {imageDataUrls.length ? "Replace image" : "Tap to upload an image"}
              </p>
              <p className="text-[11px]">Receipt, invoice or photo</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                // Single image; replace any previous.
                setImageDataUrls([]);
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {errorMsg && !verdict && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2 font-display font-semibold mb-1">
              <AlertTriangle className="h-4 w-4" /> Something went wrong
            </div>
            <p className="text-foreground/80">{errorMsg}</p>
          </div>
        )}

        {verdict && (
          <div
            className={`rounded-xl border p-3 animate-scale-in space-y-2 ${
              verdict.isMatch
                ? "bg-secondary/10 border-secondary/40"
                : "bg-destructive/10 border-destructive/40"
            }`}
          >
            <div className="flex items-center gap-2">
              {verdict.isMatch ? (
                <CheckCircle2 className="h-5 w-5 text-secondary" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <p className="font-display font-semibold text-sm">
                {verdict.isMatch
                  ? "Invoice accepted"
                  : "AI says your invoice doesn't match the intent"}
              </p>
            </div>

            <p className="text-xs text-foreground/80">{verdict.reason}</p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-background/60 border border-border text-muted-foreground">
                Provider: {verdict.provider}
              </span>
              {(verdict.invoiceCity || verdict.invoiceCountry) && (
                <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-background/60 border border-border text-muted-foreground">
                  Invoice: {[verdict.invoiceCity, verdict.invoiceCountry].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-background/60 border border-border text-muted-foreground">
                GPS: {verdict.hasGps ? "yes" : "no"}
              </span>
            </div>

            {flagChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {flagChips.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="text-[11px] flex items-center gap-1 rounded-full px-2 py-0.5 bg-destructive/15 border border-destructive/40 text-destructive"
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => nav(`/cards/${card.id}`)}>
            Back to card
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-primary text-primary-foreground font-label flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                {stage === "uploading" ? "Uploading…" : "Verifying…"}
              </>
            ) : verdict?.isMatch ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                Done
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" />
                {verdict || errorMsg ? "Re-submit" : "Submit for AI"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
