import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Owner-only routes */}
            <Route path="/dashboard/barbers" element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <Barbers />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/cashiers" element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <Cashiers />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/services" element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <Services />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/products" element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <Products />
              </ProtectedRoute>
            } />
            
            {/* Shared routes (both owner and barber) */}
            <Route path="/dashboard/transactions" element={
              <ProtectedRoute allowedRoles={["owner", "barber"]}>
                <Transactions />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/salary" element={
              <ProtectedRoute allowedRoles={["owner", "barber"]}>
                <Salary />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/schedule" element={
              <ProtectedRoute allowedRoles={["owner", "barber"]}>
                <Schedule />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
