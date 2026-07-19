import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // Garante que os routes dinâmicos sejam renderizados corretamente
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "lucide-react", "recharts"],
  },
  // Configurações de headers para evitar cache indevido
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
  // Redirecionar para trailing slashes para manter consistência
  trailingSlash: false,
};

export default nextConfig;
