import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Scissors, LogOut, Users, Package, ShoppingCart, FileText, DollarSign, Home } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut, userRole, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const ownerLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/cashiers", label: "Kasir", icon: Users },
    { href: "/dashboard/barbers", label: "Tukang Cukur", icon: Users },
    { href: "/dashboard/services", label: "Layanan", icon: Package },
    { href: "/dashboard/products", label: "Produk", icon: ShoppingCart },
    { href: "/dashboard/transactions", label: "Transaksi", icon: FileText },
    { href: "/dashboard/salary", label: "Gaji", icon: DollarSign },
  ];

  const cashierLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/transactions", label: "Transaksi Saya", icon: FileText },
  ];

  const links = userRole === "owner" ? ownerLinks : cashierLinks;

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img className="w-20" src="/public/images/logoweb.png" alt="logoweb" />

            <div>
              <h1 className="font-bold text-lg">{user?.user_metadata?.username}</h1>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;

            return (
              <Link key={link.href} to={link.href} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                <Icon className="h-5 w-5" />
                <span className="font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
