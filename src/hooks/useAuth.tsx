import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type UserRole = "owner" | "cashier" | "barber" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, role: "owner" | "barber") => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user exists in user_roles (not deleted)
  const checkUserExists = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking user existence:", error);
      return false;
    }
    return !!data;
  };

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();

    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }

    return data?.role as UserRole;
  };

  // Force logout deleted users
  const forceLogoutDeletedUser = async () => {
    setUser(null);
    setSession(null);
    setUserRole(null);
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.clear();
    sessionStorage.clear();
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(async () => {
          // Check if user still exists (wasn't deleted)
          const userExists = await checkUserExists(session.user.id);
          if (!userExists) {
            toast.error("Akun Anda telah dihapus");
            await forceLogoutDeletedUser();
            window.location.href = "/auth";
            return;
          }
          
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          setLoading(false);
        }, 0);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Check if user still exists
        const userExists = await checkUserExists(session.user.id);
        if (!userExists) {
          toast.error("Akun Anda telah dihapus");
          await forceLogoutDeletedUser();
          window.location.href = "/auth";
          return;
        }
        
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    // Check if user exists in our system (not deleted)
    if (data.user) {
      const userExists = await checkUserExists(data.user.id);
      if (!userExists) {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error("Akun tidak ditemukan atau telah dihapus");
      }
    }
    
    toast.success("Login berhasil!");
  };

  const signUp = async (email: string, password: string, username: string, role: "owner" | "barber") => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role });

      if (roleError) throw roleError;
    }

    toast.success("Registrasi berhasil!");
  };

  const signOut = async () => {
    try {
      // Clear all local state first
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success("Logout berhasil!");
      
      // Small delay to ensure state is cleared before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate programmatically instead of hard reload
      window.location.replace("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Force clear and redirect even on error
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/auth");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
