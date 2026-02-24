import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

// Pages
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import Transfer from "@/pages/Transfer";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import Query from "@/pages/Query";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
      return;
    }

    if (!isLoading && user && adminOnly && !user.isAdmin) {
      setLocation("/");
    }
  }, [isLoading, user, adminOnly, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (adminOnly && !user.isAdmin) {
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      <Route path="/deposit">
        {() => <ProtectedRoute component={Deposit} />}
      </Route>

      <Route path="/withdraw">
        {() => <ProtectedRoute component={Withdraw} />}
      </Route>

      <Route path="/transfer">
        {() => <ProtectedRoute component={Transfer} />}
      </Route>

      <Route path="/history">
        {() => <ProtectedRoute component={History} />}
      </Route>

      <Route path="/query">
        {() => <ProtectedRoute component={Query} />}
      </Route>

      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
