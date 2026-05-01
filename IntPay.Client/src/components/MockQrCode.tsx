import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { BRAND_LOGO_SRC } from "@/lib/brand";

interface Props {
  label: string;
  className?: string;
  size?: number;
}

export function MockQrCode({ label, className, size = 140 }: Props) {
  const logoSize = Math.max(24, Math.round(size * 0.22));
  return (
    <div className={cn("inline-flex flex-col items-center p-2 bg-white rounded-lg", className)}>
      <QRCodeSVG
        value={label}
        size={size}
        bgColor="#ffffff"
        fgColor="#111827"
        level="H"
        includeMargin
        imageSettings={{
          src: BRAND_LOGO_SRC,
          x: undefined,
          y: undefined,
          height: logoSize,
          width: logoSize,
          excavate: true,
        }}
      />
      <p className="text-[8px] text-center text-muted-foreground mt-1">QR · IntPay</p>
    </div>
  );
}
