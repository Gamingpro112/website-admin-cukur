import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Barbers from "./pages/Barbers";
import Cashiers from "./pages/Cashiers";
import Services from "./pages/Services";
import Products from "./pages/Products";
import Transactions from "./pages/Transactions";
import Salary from "./pages/Salary";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/cashiers" element={<Cashiers />} />
            <Route path="/dashboard/barbers" element={<Barbers />} />
            <Route path="/dashboard/services" element={<Services />} />
            <Route path="/dashboard/products" element={<Products />} />
            <Route path="/dashboard/transactions" element={<Transactions />} />
            <Route path="/dashboard/salary" element={<Salary />} />
            <Route path="/dashboard/schedule" element={<Schedule />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
