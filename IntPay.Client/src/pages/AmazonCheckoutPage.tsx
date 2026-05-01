import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Download, Lock, Pencil, ShieldCheck, Upload, XCircle } from "lucide-react";
import { simulateTapToPay } from "@/api/simulateTap";
import { useCurrentUserContext } from "@/lib/currentUserContext";

/**
 * Mock Amazon checkout page at /amazon. Uses a real backend tap-to-pay
 * simulation against the IntPay API. On success, shows a printable invoice
 * the user can download and re-upload as proof.
 */

type Item = {
  id: string;
  title: string;
  seller: string;
  price: number;
  qty: number;
  image: string;
};

// Items priced in USD. Laptop $956 + Keyboard $230 = $1186 subtotal,
// remaining $14 is tax to reach a clean $1200 order total.
const ITEMS: Item[] = [
  {
    id: "mac",
    title: 'Apple MacBook Pro 14" (M3 Pro chip, 18GB RAM, 512GB SSD) — Space Black',
    seller: "Apple Store",
    price: 956,
    qty: 1,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=70",
  },
  {
    id: "kbd",
    title: "Logitech MX Keys S Wireless Illuminated Keyboard — Backlit, Multi-Device, USB-C",
    seller: "Logitech Official",
    price: 230,
    qty: 1,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=200&q=70",
  },
];

const SHIPPING = 0; // free shipping
const TAX = 14; // brings total to a clean $1200.00

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const MERCHANT = "Amazon.com";
const MCC = "5732"; // Electronics
const CITY = "Seattle";
const COUNTRY = "US";

export default function AmazonCheckoutPage() {
  const { profile } = useCurrentUserContext();
  const buyerName = profile?.name?.trim() || "IntPay Customer";
  const [params] = useSearchParams();
  const initialCard = params.get("card") ?? "";

  const [cardNumber, setCardNumber] = useState(initialCard);
  const [cardTouched, setCardTouched] = useState(false);

  const [addrOpen, setAddrOpen] = useState(false);
  // Open the payment section by default when no card is provided yet.
  const [payOpen, setPayOpen] = useState(initialCard.replace(/\D/g, "").length !== 16);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ approved: boolean; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const cardDigits = cardNumber.replace(/\D/g, "");
  const cardValid = cardDigits.length === 16;
  const last4 = cardValid ? cardDigits.slice(-4) : "----";

  const itemsTotal = useMemo(
    () => ITEMS.reduce((acc, i) => acc + i.price * i.qty, 0),
    [],
  );
  const total = itemsTotal + SHIPPING + TAX;
  const orderId = useMemo(
    () => `AMZ-${Math.floor(100000 + Math.random() * 900000)}`,
    [],
  );
  const orderDate = useMemo(() => new Date(), []);

  const handleCardChange = (v: string) => {
    // Keep only digits, max 16; format as 4-4-4-4 for display.
    const digits = v.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
    setCardTouched(true);
    if (digits.length === 16) {
      // Auto-collapse the payment section once we have a complete number.
      setPayOpen(false);
    }
  };

  const placeOrder = async () => {
    setCardTouched(true);
    if (!cardValid) {
      setPayOpen(true);
      setError("Please enter your 16-digit IntPay card number.");
      return;
    }
    setPlacing(true);
    setError(null);
    setResult(null);
    const res = await simulateTapToPay({
      cardNumber: cardDigits,
      amount: Number(total.toFixed(2)),
      merchantName: MERCHANT,
      mcc: MCC,
      city: CITY,
      country: COUNTRY,
    });
    setPlacing(false);
    if (!res.isSucess || !res.data) {
      setError(res.error[0] ?? "Something went wrong");
      return;
    }
    setResult(res.data);
    if (!res.data.approved) {
      setError(res.data.reason || "Declined");
    }
  };

  const downloadInvoice = async () => {
    if (!invoiceRef.current) return;
    // Render the invoice DOM into a PNG using a foreignObject SVG trick
    // (no external libs). Falls back to opening a printable window.
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
      link.download = `invoice-${orderId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: open a printable invoice window
      const win = window.open("", "_blank");
      if (win && invoiceRef.current) {
        win.document.write(
          `<html><head><title>Invoice ${orderId}</title></head><body>${invoiceRef.current.outerHTML}</body></html>`,
        );
        win.document.close();
        win.print();
      }
    }
  };

  const approved = result?.approved === true;

  return (
    <div className="min-h-screen bg-[#EAEDED] text-[#0F1111]">
      <header className="bg-[#131A22] text-white">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold tracking-tight">amazon</span>
            <span className="text-[10px] text-[#FF9900]">.com</span>
          </div>
          <h1 className="text-lg sm:text-xl font-semibold">
            Checkout <span className="text-[#007185] font-normal">({ITEMS.length} items)</span>
          </h1>
          <Lock className="h-4 w-4 opacity-80" />
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Section
            n={1}
            title="Delivery address"
            open={addrOpen}
            onToggle={() => setAddrOpen((v) => !v)}
            summary={
              <div className="text-sm text-[#0F1111]">
                <p className="font-semibold">Sara Thompson</p>
                <p className="text-[#565959] leading-snug">
                  500 Pine Street, Suite 1200<br />
                  Seattle, WA 98101, United States
                </p>
              </div>
            }
          >
            <p className="text-sm text-[#565959]">Default address selected.</p>
          </Section>

          <Section
            n={2}
            title="Payment method"
            open={payOpen}
            onToggle={() => setPayOpen((v) => !v)}
            summary={
              <div className="text-sm">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <IntPayBadge />
                  <span className="font-semibold">IntPay smart-contract card</span>
                  {cardValid ? (
                    <span className="text-[#565959] tabular-nums">
                      ending in <strong>{last4}</strong>
                    </span>
                  ) : (
                    <span className="text-[#B12704] text-xs font-semibold">
                      Card number required
                    </span>
                  )}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-[#EAF6EC] text-[#067D62] text-[11px] font-semibold px-2 py-0.5 border border-[#067D62]/20">
                  <ShieldCheck className="h-3 w-3" />
                  Spend governed by IntPay intent rules
                </div>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <IntPayBadge />
                <p className="text-sm font-semibold">Pay with your IntPay card</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F1111] mb-1">
                  Card number <span className="text-[#B12704]">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => handleCardChange(e.target.value)}
                  onBlur={() => setCardTouched(true)}
                  className={`w-full sm:w-80 rounded border px-3 py-2 text-sm font-mono tabular-nums tracking-wider bg-white focus:outline-none focus:ring-2 ${
                    cardTouched && !cardValid
                      ? "border-[#B12704] focus:ring-[#B12704]/30"
                      : "border-[#888C8C] focus:ring-[#007185]/40 focus:border-[#007185]"
                  }`}
                />
                {cardTouched && !cardValid ? (
                  <p className="mt-1 text-xs text-[#B12704]">
                    Enter the full 16-digit card number from your IntPay card.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[#565959]">
                    {cardValid
                      ? "Looks good — this section will close automatically."
                      : "Open your IntPay card details and copy the full number here."}
                  </p>
                )}
              </div>
              {cardValid && (
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="text-xs text-[#007185] hover:text-[#C7511F] font-semibold underline"
                >
                  Use this card
                </button>
              )}
            </div>
          </Section>

          <Section n={3} title="Review items and delivery" open onToggle={() => {}} chevron={false}>
            <div className="rounded border border-[#007185]/40 bg-[#F7FCFD] p-3 mb-3 text-sm flex gap-2">
              <ShieldCheck className="h-4 w-4 text-[#007185] shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">Important:</span> This order will be authorised
                by your IntPay smart-contract card. Only items matching the card's intent rules
                will be approved.
              </p>
            </div>
            <div className="divide-y divide-[#E7E7E7]">
              {ITEMS.map((it) => (
                <div key={it.id} className="py-3 flex gap-3">
                  <img
                    src={it.image}
                    alt=""
                    className="w-20 h-20 object-cover rounded border border-[#E7E7E7]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{it.title}</p>
                    <p className="text-[#B12704] font-bold mt-1 tabular-nums">
                      {fmt(it.price)} {it.qty > 1 && <span className="text-[#0F1111] font-normal text-xs">× {it.qty}</span>}
                    </p>
                    <p className="text-xs text-[#565959] mt-1">
                      Sold by: <span className="text-[#007185]">{it.seller}</span>
                    </p>
                  </div>
                  <div className="text-sm font-bold tabular-nums text-[#0F1111]">
                    {fmt(it.price * it.qty)}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {error && !approved && (
            <div className="rounded border border-[#B12704]/40 bg-[#FFF5F5] p-3 text-sm text-[#B12704] flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Payment failed</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <PlaceBox total={total} placing={placing} placed={approved} onPlace={placeOrder} />
        </div>

        <aside className="lg:sticky lg:top-4 self-start">
          <div className="bg-white border border-[#D5D9D9] rounded p-4 space-y-3">
            <PlaceButton placing={placing} placed={approved} onClick={placeOrder} />
            <p className="text-xs text-[#565959] leading-snug">
              By placing your order, you agree to IntPay's spending policy and Amazon's
              conditions of use.
            </p>
            <div className="border-t border-[#E7E7E7] pt-3">
              <h2 className="font-bold mb-2">Order Summary</h2>
              <Row label={`Items (${ITEMS.reduce((a, i) => a + i.qty, 0)}):`} value={fmt(itemsTotal)} />
              <Row label="Shipping & handling:" value="FREE" />
              <Row label="Estimated tax:" value={fmt(TAX)} />
              <div className="border-t border-[#E7E7E7] mt-2 pt-2">
                <Row label="Order Total:" value={fmt(total)} bold red />
              </div>
            </div>
            <div className="border-t border-[#E7E7E7] pt-3 flex items-start gap-2 bg-[#F7FCFD] -mx-4 -mb-4 px-4 py-3 rounded-b">
              <IntPayBadge />
              <p className="text-xs">
                <span className="font-semibold">Paying with IntPay</span><br />
                <span className="text-[#565959]">
                  Card •••• {last4} · Real-time intent rules check.
                </span>
              </p>
            </div>
          </div>
        </aside>
      </main>

      {approved && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl my-8">
            <div className="p-5 border-b border-[#E7E7E7] flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#067D62] text-white flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Order placed & approved</h3>
                <p className="text-xs text-[#565959]">
                  IntPay authorised <strong>{fmt(total)}</strong> on card •••• {last4}.
                </p>
              </div>
            </div>

            {/* Invoice — printable / downloadable */}
            <div ref={invoiceRef} className="p-6 bg-white text-[#0F1111]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-display text-xl font-bold">amazon<span className="text-[#FF9900] text-xs">.com</span></p>
                  <p className="text-xs text-[#565959]">Invoice / Tax receipt</p>
                </div>
                <div className="text-right text-xs text-[#565959]">
                  <p><strong className="text-[#0F1111]">Order #</strong> {orderId}</p>
                  <p>{orderDate.toLocaleString("en-US")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div>
                  <p className="font-semibold mb-0.5">Billed to</p>
                  <p className="text-[#565959]">{buyerName}<br />500 Pine Street, Suite 1200<br />Seattle, WA 98101, US</p>
                </div>
                <div>
                  <p className="font-semibold mb-0.5">Merchant</p>
                  <p className="text-[#565959]">{MERCHANT}<br />{CITY}, {COUNTRY}<br />MCC {MCC} · Electronics</p>
                </div>
              </div>

              <table className="w-full text-xs border-t border-[#E7E7E7]">
                <thead>
                  <tr className="text-left text-[#565959]">
                    <th className="py-2 font-semibold">Item</th>
                    <th className="py-2 font-semibold text-center">Qty</th>
                    <th className="py-2 font-semibold text-right">Unit</th>
                    <th className="py-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {ITEMS.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 pr-2">{it.title}</td>
                      <td className="py-2 text-center tabular-nums">{it.qty}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(it.price)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold">{fmt(it.price * it.qty)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-[#E7E7E7]">
                  <tr><td colSpan={3} className="py-1 text-right text-[#565959]">Subtotal</td><td className="py-1 text-right tabular-nums">{fmt(itemsTotal)}</td></tr>
                  <tr><td colSpan={3} className="py-1 text-right text-[#565959]">Shipping</td><td className="py-1 text-right tabular-nums">FREE</td></tr>
                  <tr><td colSpan={3} className="py-1 text-right text-[#565959]">Tax</td><td className="py-1 text-right tabular-nums">{fmt(TAX)}</td></tr>
                  <tr><td colSpan={3} className="py-2 text-right font-bold">Total paid</td><td className="py-2 text-right tabular-nums font-bold text-[#B12704]">{fmt(total)}</td></tr>
                </tfoot>
              </table>

              <div className="mt-4 rounded border border-[#067D62]/30 bg-[#F0F9F4] p-2 text-[11px] text-[#067D62]">
                ✓ Authorised via IntPay smart-contract card •••• {last4} · Reason: {result?.reason}
              </div>
            </div>

            <div className="p-4 border-t border-[#E7E7E7] bg-[#F7F7F7] rounded-b-xl flex flex-col gap-2">
              <button
                onClick={downloadInvoice}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD814] hover:bg-[#F7CA00] border border-[#FCD200] rounded py-2 text-sm font-semibold"
              >
                <Download className="h-4 w-4" /> Download invoice image
              </button>
              <p className="text-[11px] text-[#565959] text-center inline-flex items-center justify-center gap-1">
                <Upload className="h-3 w-3" /> Save it, then upload as proof on your IntPay card.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------- pieces -------------------------- */

function Section({
  n,
  title,
  open,
  onToggle,
  summary,
  children,
  chevron = true,
}: {
  n: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: React.ReactNode;
  children?: React.ReactNode;
  chevron?: boolean;
}) {
  return (
    <section className="bg-white border border-[#D5D9D9] rounded">
      <header className="flex items-start gap-3 p-4">
        <span className="text-[#565959] font-bold tabular-nums w-4 shrink-0">{n}</span>
        <h2 className="font-bold flex-1">{title}</h2>
        {chevron && (
          <button
            onClick={onToggle}
            className="text-[#007185] hover:text-[#C7511F] text-xs font-semibold inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" /> Change
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </header>
      <div className="px-4 pb-4 pl-11">{open ? children : summary}</div>
    </section>
  );
}

function Row({
  label, value, bold, red,
}: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between text-sm ${bold ? "font-bold" : ""} ${red ? "text-[#B12704]" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PlaceBox({
  total, placing, placed, onPlace,
}: { total: number; placing: boolean; placed: boolean; onPlace: () => void }) {
  return (
    <div className="bg-white border border-[#D5D9D9] rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <PlaceButton placing={placing} placed={placed} onClick={onPlace} />
      <p className="text-sm font-bold text-[#B12704] tabular-nums">Order Total: {fmt(total)}</p>
    </div>
  );
}

function PlaceButton({
  placing, placed, onClick,
}: { placing: boolean; placed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={placing || placed}
      className="w-full bg-gradient-to-b from-[#F7DFA5] to-[#F0C14B] hover:from-[#F5D78E] hover:to-[#EEB933] border border-[#A88734] text-[#0F1111] rounded py-2 text-sm font-semibold shadow-sm disabled:opacity-70"
    >
      {placed ? "Order placed ✓" : placing ? "Authorising with IntPay…" : "Place your order and pay with IntPay"}
    </button>
  );
}

function IntPayBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0F0F12] text-white px-2.5 py-1 text-sm font-bold tracking-wide shadow-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-[#0FB78E] shadow-[0_0_6px_#0FB78E]" />
      IntPay
    </span>
  );
}
