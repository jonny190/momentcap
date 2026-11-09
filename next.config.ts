import type { NextConfig } from "next"
import path from "path"

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Native or wasm-backed packages are loaded from node_modules at runtime
  // instead of being bundled.
  serverExternalPackages: ["better-sqlite3", "sharp", "archiver", "heic-convert"],
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default config
