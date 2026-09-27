import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde otros dispositivos en tu red (HMR).
  allowedDevOrigins: [
    "192.168.1.50",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
