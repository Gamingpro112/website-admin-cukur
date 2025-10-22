import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

type Period = "today" | "week" | "month";

const BarberSalary = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("today");

  const getDateRange = (period: Period) => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ["barber-salary", user?.id, period],
    queryFn: async () => {
      if (!user?.id) return null;

      const { start, end } = getDateRange(period);

      // Get barber record for this user
      const { data: barber } = await supabase
        .from("barbers")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!barber) return null;

      // Get transactions for this barber
      const { data, error } = await supabase
        .from("transactions")
        .select("total_price")
        .eq("barber_id", barber.id)
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", end.toISOString());

      if (error) throw error;

      const total = data.reduce((sum, t) => sum + Number(t.total_price), 0);
      const count = data.length;

      return { total, count };
    },
    enabled: !!user?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = (period: Period) => {
    switch (period) {
      case "today":
        return "Hari Ini";
      case "week":
        return "Minggu Ini";
      case "month":
        return "Bulan Ini";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pendapatan Saya</h1>
          <p className="text-muted-foreground">Lihat pendapatan Anda berdasarkan periode</p>
        </div>

        <div className="space-y-2 w-full sm:w-64">
          <Label>Periode</Label>
          <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pendapatan - {getPeriodLabel(period)}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Memuat...</p>
              ) : (
                <p className="text-3xl font-bold text-accent">
                  {formatCurrency(salaryData?.total || 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Jumlah Transaksi - {getPeriodLabel(period)}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Memuat...</p>
              ) : (
                <p className="text-3xl font-bold">{salaryData?.count || 0}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Data pendapatan dihitung berdasarkan transaksi yang tercatat atas nama Anda.
              Pilih periode berbeda untuk melihat pendapatan di rentang waktu yang berbeda.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BarberSalary;
