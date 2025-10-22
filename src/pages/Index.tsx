import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="flex justify-center">
          <div className="p-4">
            <img src="./public/images/logoweb.png" alt="logo web" />
          </div>
        </div>
        <h1 className="text-4xl font-bold">Barbershop Kasir</h1>
        <p className="text-xl text-muted-foreground">Sistem Manajemen Barbershop Modern untuk Owner & Kasir</p>
        <Button size="lg" onClick={() => navigate("/auth")} className="mt-4">
          Masuk ke Sistem
        </Button>
      </div>
    </div>
  );
};

export default Index;
