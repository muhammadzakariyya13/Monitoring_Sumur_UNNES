"use client";
import { SplashScreen } from "./splash-screen";
import dynamic from "next/dynamic";
import { Gate } from "./auth";

// Grafik, peta dan data contoh baru diunduh setelah akses dashboard diizinkan.
const Dashboard = dynamic(() => import("./dashboard"), {
  ssr: false,
  loading: () => <SplashScreen message="Memuat dashboard" />,
});
export function Workspace() {
  return (
    <Gate>
      <Dashboard />
    </Gate>
  );
}
