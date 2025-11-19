import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import Portfolio from "./pages/Portfolio";
import Staking from "./pages/Staking";
import Vesting from "./pages/Vesting";
import TokenDetail from "./pages/TokenDetail";
import NotFound from "./pages/NotFound";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

const App = () => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet })]} autoConnect>
        <WalletModalProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Header />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create" element={<CreateToken />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/staking" element={<Staking />} />
                  <Route path="/vesting" element={<Vesting />} />
                  <Route path="/token/:id" element={<TokenDetail />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </QueryClientProvider>
  );
};

export default App;
