import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Package, ShoppingCart, FileText, DollarSign, Home, Calendar } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { signOut, userRole, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const ownerLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/barbers", label: "Tukang Cukur", icon: Users },
    { href: "/dashboard/schedule", label: "Jadwal", icon: Calendar },
    { href: "/dashboard/services", label: "Layanan", icon: Package },
    { href: "/dashboard/products", label: "Produk", icon: ShoppingCart },
    { href: "/dashboard/transactions", label: "Transaksi", icon: FileText },
    { href: "/dashboard/salary", label: "Gaji", icon: DollarSign },
  ];

  const barberLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/schedule", label: "Jadwal", icon: Calendar },
    { href: "/dashboard/transactions", label: "Transaksi Saya", icon: FileText },
    { href: "/dashboard/salary", label: "Pendapatan ", icon: DollarSign },
  ];

  const links = userRole === "owner" ? ownerLinks : barberLinks;

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row transition-all duration-300">
      {/* Sidebar (Desktop Only) */}
      <aside className={cn("bg-card border-r border-border flex-col transition-all duration-300 hidden md:flex", sidebarOpen ? "w-64" : "w-20")}>
        <div className="p-6 border-b border-border flex items-center gap-3">
          <img className="w-12" src="/images/logoweb.png" alt="logoweb" />
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg">{user?.user_metadata?.username}</h1>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link key={link.href} to={link.href} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg transition-colors", isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground")}>
                <Icon className="h-5 w-5" />
                {sidebarOpen && <span className="font-medium">{link.label}</span>}
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
      <main className="flex-1 p-6 overflow-auto md:pb-0 pb-20">{children}</main>

      {/* Bottom Navbar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center overflow-x-auto md:hidden">
        <div className="flex w-full justify-between items-center px-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn("flex flex-col items-center justify-center text-xs px-3 py-2 transition-colors flex-shrink-0", isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span>{link.label.split(" ")[0]}</span>
              </Link>
            );
          })}

          {/* Tombol Logout di Mobile */}
          <button onClick={handleLogout} className="flex flex-col items-center justify-center text-xs text-muted-foreground hover:text-red-500 transition-colors px-3 py-2 flex-shrink-0">
            <LogOut className="h-5 w-5 mb-1" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DashboardLayout;
