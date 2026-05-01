import { useMemo, useRef, useState } from "react";
import { Download, Home, Lock, ShieldCheck, XCircle } from "lucide-react";
import { useCurrentUserContext } from "@/lib/currentUserContext";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const MERCHANT = "Pacific View Property Management";
const MCC = "6513"; // Real estate agents and managers
const CITY = "San Diego";
const COUNTRY = "US";
const STATE = "CA";
const ZIP = "92101";
const PROPERTY_ADDRESS = "1450 Front St, Unit 1208";
const TAP_IMAGE =
  "https://tempfile.aiquickdraw.com/workers/nano/image_1777654503395_igtaz6.png";
const MOCK_RENT_AMOUNT = 2450;
const MOCK_CARD_DIGITS = "4111275871351897";

export default function RentCheckoutPage() {
  const { profile } = useCurrentUserContext();
  const tenantName = profile?.name?.trim() || "IntPay Tenant";
  const tenantEmail = profile?.email?.trim() || "tenant@intentpay.local";
  const tenantId = profile?.id != null ? String(profile.id) : "—";

  const [amountInput, setAmountInput] = useState("2450");
  const [cardNumber, setCardNumber] = useState("");
  const [cardTouched, setCardTouched] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; reason: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const amount = Number(amountInput);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const cardDigits = cardNumber.replace(/\D/g, "");
  const cardValid = cardDigits.length === 16;
  const mockedLast4 = MOCK_CARD_DIGITS.slice(-4);
  const invoiceId = useMemo(
    () => `RNT-${Math.floor(100000 + Math.random() * 900000)}`,
    [],
  );
  const issuedAt = useMemo(() => new Date(), []);
  const dueDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return d;
  }, []);

  const handleCardChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
    setCardTouched(true);
  };

  const payRent = async () => {
    setCardTouched(true);
    setPlacing(true);
    setError(null);
    setResult(null);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setPlacing(false);

    const mockApproved = { approved: true, reason: "Approved (mock rent flow)" };
    setResult(mockApproved);
    setInvoiceOpen(true);
  };

  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    try {
      const node = invoiceRef.current;
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const serialized = new XMLSerializer().serializeToString(node);
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: -apple-system, system-ui, sans-serif; background: white;">
              ${serialized}
            </div>
          </foreignObject>
        </svg>`;
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("render failed"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w * 2;
      canvas.height = h * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas ctx");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `rent-invoice-${invoiceId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      const win = window.open("", "_blank");
      if (win && invoiceRef.current) {
        win.document.write(
          `<html><head><title>Invoice ${invoiceId}</title></head><body>${invoiceRef.current.outerHTML}</body></html>`,
        );
        win.document.close();
        win.print();
      }
    }
  };

  const approved = result?.approved === true;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <p className="font-display text-xl font-bold">IntPay Rent Portal</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure IntPay checkout
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Rent payment
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Pay monthly rent with your IntPay card
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This mock checkout simulates a landlord payment authorization through
            IntPay smart intent rules. If approved, you can download a rent
            invoice image immediately.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img
              src={TAP_IMAGE}
              alt="Tap to buy with IntPay card"
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold">Property details</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-medium">Landlord:</span> Pacific View Property
                Management
              </p>
              <p>
                <span className="font-medium">Unit:</span> 1208
              </p>
              <p>
                <span className="font-medium">Address:</span> {PROPERTY_ADDRESS}
              </p>
              <p>
                <span className="font-medium">City/State:</span> {CITY}, {STATE} {ZIP}
              </p>
            </div>
          </div>

          {error && !approved && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Payment failed</p>
                <p className="mt-0.5 text-xs">{error}</p>
              </div>
            </div>
          )}
        </section>

        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-4">
          <h2 className="font-display text-lg font-bold">Payment details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount (USD)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Card number
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => handleCardChange(e.target.value)}
                onBlur={() => setCardTouched(true)}
                className={`h-11 w-full rounded-lg border px-3 text-sm font-mono tracking-widest outline-none transition ${
                  cardTouched && !cardValid
                    ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    : "border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/25"
                }`}
              />
              {cardTouched && !cardValid && (
                <p className="mt-1 text-xs text-rose-600">Card number must be 16 digits.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Paying with card ending in <strong>{mockedLast4}</strong> at {MERCHANT} ({CITY}, {COUNTRY})
          </div>

          <button
            type="button"
            onClick={payRent}
            disabled={placing}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-70"
          >
            {placing ? "Authorizing IntPay payment..." : `Pay ${fmt(validAmount ? amount : 0)}`}
          </button>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="h-3.5 w-3.5" /> IntPay checks rent intent rules in real-time
          </p>
        </aside>
      </main>

      {invoiceOpen && approved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <h3 className="font-display text-xl font-bold">Rent invoice ready</h3>
              <p className="mt-1 text-sm text-slate-600">
                Payment approved by IntPay. Download the invoice image below.
              </p>
            </div>

            <div ref={invoiceRef} className="bg-white p-6 text-slate-900">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="font-display text-2xl font-bold">Pacific View Property</p>
                  <p className="text-xs text-slate-500">Residential Rent Invoice</p>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-900">Invoice #</span>{" "}
                    {invoiceId}
                  </p>
                  <p>{issuedAt.toLocaleString("en-US")}</p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-semibold text-slate-900">Tenant</p>
                  <p className="text-slate-600">
                    {tenantName}
                    <br />
                    {tenantEmail}
                    <br />
                    Tenant ID: {tenantId}
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-semibold text-slate-900">Property</p>
                  <p className="text-slate-600">
                    {PROPERTY_ADDRESS}
                    <br />
                    {CITY}, {STATE} {ZIP}, USA
                    <br />
                    MCC {MCC} · Rent / Real estate
                  </p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="text-slate-500">
                  <tr className="border-y border-slate-200">
                    <th className="py-2 text-left font-semibold">Description</th>
                    <th className="py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-2">Monthly rent payment (Unit 1208)</td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      {fmt(MOCK_RENT_AMOUNT)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-3 text-right font-semibold">Total paid</td>
                    <td className="pt-3 text-right font-bold tabular-nums text-rose-700">
                      {fmt(MOCK_RENT_AMOUNT)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-4 rounded border border-emerald-300 bg-emerald-50 p-2 text-[11px] text-emerald-700">
                ✓ Authorized with IntPay card •••• {mockedLast4} · Status: {result.reason}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Due date: {dueDate.toLocaleDateString("en-US")} · Payment location: {CITY}, {STATE} {ZIP}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
              <button
                type="button"
                onClick={downloadInvoice}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                <Download className="h-4 w-4" /> Download as image
              </button>
              <button
                type="button"
                onClick={() => setInvoiceOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
