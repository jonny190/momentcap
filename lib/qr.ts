// lib/qr.ts
import QRCode from "qrcode"

export async function generateQRCodePNG(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", width: 400, margin: 2 })
}
