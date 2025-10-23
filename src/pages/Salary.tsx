import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Period = "today" | "week" | "month" | "year" | "custom";

const Salary = () => {
  const [period, setPeriod] = useState<Period>("today");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getDateRange = (period: Period) => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "custom":
        const customDate = new Date(selectedYear, selectedMonth - 1, 1);
        return { start: startOfMonth(customDate), end: endOfMonth(customDate) };
    }
  };

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ["salary", period, selectedYear, selectedMonth],
    queryFn: async () => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          barber_id,
          total_price,
          barbers(name)
        `
        )
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", end.toISOString());

      if (error) throw error;

      const salaryByBarber = data.reduce((acc: any, transaction: any) => {
        const barberId = transaction.barber_id;
        const barberName = transaction.barbers?.name || "Unknown";

        if (!acc[barberId]) {
          acc[barberId] = {
            barber_id: barberId,
            barber_name: barberName,
            total_earnings: 0,
            transaction_count: 0,
          };
        }

        acc[barberId].total_earnings += Number(transaction.total_price);
        acc[barberId].transaction_count += 1;

        return acc;
      }, {});

      return Object.values(salaryByBarber);
    },
  });

  // Detail transaksi per layanan
  const { data: barberTransactions, isLoading: loadingDetails } = useQuery({
    queryKey: ["barber-transactions", selectedBarber?.barber_id, period, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!selectedBarber) return [];
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          total_price,
          services(service_name)
        `
        )
        .eq("barber_id", selectedBarber.barber_id)
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", end.toISOString());

      if (error) throw error;

      // 🔥 Kelompokkan berdasarkan layanan
      const groupedServices = data.reduce((acc: any, t: any) => {
        const serviceName = t.services?.service_name || "Produk";
        if (!acc[serviceName]) {
          acc[serviceName] = { count: 0, total: 0 };
        }
        acc[serviceName].count += 1;
        acc[serviceName].total += Number(t.total_price);
        return acc;
      }, {});

      // Ubah ke bentuk array
      return Object.entries(groupedServices).map(([service_name, value]: any) => ({
        service_name,
        count: value.count,
        total: value.total,
      }));
    },
    enabled: !!selectedBarber,
  });

  const totalEarnings = Number(salaryData?.reduce((sum: number, barber: any) => sum + Number(barber.total_earnings), 0) ?? 0);

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
      case "year":
        return "Tahun Ini";
      case "custom":
        return `${format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", {
          locale: localeId,
        })}`;
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Laporan Gaji</h1>
          <p className="text-muted-foreground">Lihat pendapatan tukang cukur berdasarkan periode</p>
        </div>

        {/* Pilihan Periode */}
        <div className="flex flex-wrap gap-4 items-end">
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
                <SelectItem value="year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Kustom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <>
              <div className="space-y-2 w-full sm:w-40">
                <Label>Tahun</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full sm:w-40">
                <Label>Bulan</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {format(new Date(2000, month - 1), "MMMM", { locale: localeId })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Total Pendapatan */}
        <Card>
          <CardHeader>
            <CardTitle>Total Pendapatan - {getPeriodLabel(period)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent">{formatCurrency(totalEarnings)}</p>
          </CardContent>
        </Card>

        {/* Tabel Gaji */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Tukang Cukur</TableHead>
                <TableHead>Jumlah Transaksi</TableHead>
                <TableHead>Total Pendapatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : salaryData && salaryData.length > 0 ? (
                salaryData.map((barber: any) => (
                  <TableRow
                    key={barber.barber_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedBarber(barber);
                      setIsDialogOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">{barber.barber_name}</TableCell>
                    <TableCell>{barber.transaction_count}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(barber.total_earnings))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Tidak ada data untuk periode ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dialog Detail Layanan */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detail Layanan - {selectedBarber?.barber_name}</DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <p className="text-center text-muted-foreground py-4">Memuat...</p>
            ) : barberTransactions && barberTransactions.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barberTransactions.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.service_name}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Tidak ada transaksi untuk periode ini</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Salary;
