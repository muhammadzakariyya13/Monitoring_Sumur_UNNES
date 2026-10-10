"use client";
import dynamic from "next/dynamic";
import { SplashScreen } from "@/components/splash-screen";
const Dashboard = dynamic(() => import("@/components/dashboard"), { ssr: false, loading: () => <SplashScreen message="Memuat pratinjau Admin" /> });
export default function AdminPreviewPage() { return <Dashboard adminPreview />; }
