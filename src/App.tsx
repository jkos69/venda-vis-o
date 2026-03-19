import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { ThemeInit } from "@/components/ThemeInit";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import DashboardPage from "./pages/DashboardPage";
import BUPage from "./pages/BUPage";
import CanalPage from "./pages/CanalPage";
import ClientePage from "./pages/ClientePage";
import ProdutoPage from "./pages/ProdutoPage";
import GeografiaPage from "./pages/GeografiaPage";
import EvolucaoPage from "./pages/EvolucaoPage";
import UploadPage from "./pages/UploadPage";
import TubetesEvolution from "./pages/TubetesEvolution";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppInner() {
  useSupabaseData(); // Carrega dados do banco ao iniciar

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/bu" element={<BUPage />} />
        <Route path="/canal" element={<CanalPage />} />
        <Route path="/cliente" element={<ClientePage />} />
        <Route path="/produto" element={<ProdutoPage />} />
        <Route path="/geografia" element={<GeografiaPage />} />
        <Route path="/evolucao" element={<EvolucaoPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/tubetes" element={<TubetesEvolution />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeInit />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
