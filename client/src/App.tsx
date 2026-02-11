import { Switch, Route, Link } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { useThirdwebClient } from "@/hooks/use-thirdweb";
import { BottomNav } from "@/components/bottom-nav";
import { useEffect } from "react";

import Dashboard from "@/pages/dashboard";
import Trade from "@/pages/trade";
import Vault from "@/pages/vault";
import StrategyPage from "@/pages/strategy";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

const wallets = [
  inAppWallet(),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
];

function WalletSync() {
  const account = useActiveAccount();

  useEffect(() => {
    if (account?.address) {
      apiRequest("POST", "/api/auth/wallet", {
        walletAddress: account.address,
      }).catch(console.error);
    }
  }, [account?.address]);

  return null;
}

function Header() {
  const { client, isLoading } = useThirdwebClient();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/95 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 cursor-pointer" data-testid="link-logo-home">
        <div className="h-7 w-7 rounded-md bg-primary/20 flex items-center justify-center glow-green-sm">
          <span className="text-sm font-bold text-primary">N</span>
        </div>
        <span className="text-sm font-bold tracking-wider">NEXA</span>
      </Link>
      {isLoading || !client ? (
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      ) : (
        <ConnectButton
          client={client}
          wallets={wallets}
          connectButton={{
            label: "Connect",
            style: {
              background: "hsl(142, 72%, 45%)",
              color: "hsl(150, 20%, 5%)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "600",
              height: "36px",
              padding: "0 16px",
              border: "none",
            },
          }}
          detailsButton={{
            style: {
              background: "hsl(150, 8%, 14%)",
              color: "hsl(150, 5%, 95%)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500",
              height: "36px",
              padding: "0 12px",
              border: "1px solid hsl(150, 8%, 20%)",
            },
          }}
          theme="dark"
        />
      )}
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trade" component={Trade} />
      <Route path="/vault" component={Vault} />
      <Route path="/strategy" component={StrategyPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="mx-auto max-w-lg">
              <Router />
            </main>
            <BottomNav />
            <WalletSync />
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

export default App;
