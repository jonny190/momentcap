import QRCode from "qrcode"

const options = { errorCorrectionLevel: "M" as const, margin: 2 }

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...options, type: "svg", color: { dark: "#1c1917", light: "#ffffff" } })
}

export function qrPng(url: string, width = 1200): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...options, type: "png", width })
}
