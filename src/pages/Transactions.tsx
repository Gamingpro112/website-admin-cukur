import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const Transactions = () => {
  const { user, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    barber_id: "",
    service_id: "",
    product_id: "",
    payment_method: "cash",
  });
  const queryClient = useQueryClient();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", user?.id, userRole],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          barbers(name),
          services(service_name, price),
          products(product_name, price)
        `
        )
        .order("transaction_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("service_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("product_name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const selectedService = services?.find((s) => s.id === data.service_id);
      const selectedProduct = products?.find((p) => p.id === data.product_id);

      const totalPrice = (selectedService ? Number(selectedService.price) : 0) + (selectedProduct ? Number(selectedProduct.price) : 0);

      if (editingId) {
        const { error } = await supabase
          .from("transactions")
          .update({
            barber_id: data.barber_id || null,
            service_id: data.service_id || null,
            product_id: data.product_id || null,
            total_price: totalPrice,
            payment_method: data.payment_method,
          })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert({
          cashier_id: user?.id,
          barber_id: data.barber_id || null,
          service_id: data.service_id || null,
          product_id: data.product_id || null,
          total_price: totalPrice,
          payment_method: data.payment_method,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(editingId ? "Transaksi berhasil diperbarui" : "Transaksi berhasil ditambahkan");
      setIsOpen(false);
      setEditingId(null);
      setFormData({
        barber_id: "",
        service_id: "",
        product_id: "",
        payment_method: "cash",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan transaksi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transaksi berhasil dihapus");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus transaksi");
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.barber_id) {
      addMutation.mutate(formData);
    } else {
      toast.error("Silakan pilih tukang cukur");
    }
  };

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setFormData({
      barber_id: transaction.barber_id || "",
      service_id: transaction.service_id || "",
      product_id: transaction.product_id || "",
      payment_method: transaction.payment_method || "cash",
    });
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({
      barber_id: "",
      service_id: "",
      product_id: "",
      payment_method: "cash",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Pagination logic
  const totalTransactions = transactions?.length || 0;
  const totalPages = Math.ceil(totalTransactions / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const displayedTransactions = transactions?.slice(startIndex, startIndex + rowsPerPage) || [];

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Transaksi</h1>
            <p className="text-muted-foreground">{userRole === "owner" ? "Lihat semua transaksi" : "Kelola transaksi Anda"}</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Transaksi" : "Tambah Transaksi"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tukang Cukur</Label>
                  <Select value={formData.barber_id} onValueChange={(value) => setFormData({ ...formData, barber_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tukang cukur" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers?.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Layanan (Opsional)</Label>
                  <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.service_name} - {formatCurrency(Number(service.price))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Produk (Opsional)</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.product_name} - {formatCurrency(Number(product.price))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih metode pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Tunai</SelectItem>
                      <SelectItem value="non-cash">Non-Tunai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tukang Cukur</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Metode Pembayaran</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : displayedTransactions.length > 0 ? (
                displayedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {format(new Date(transaction.transaction_date), "dd MMM yyyy HH:mm", {
                        locale: localeId,
                      })}
                    </TableCell>
                    <TableCell>{transaction.barbers?.name || "-"}</TableCell>
                    <TableCell>{transaction.services?.service_name || "-"}</TableCell>
                    <TableCell>{transaction.products?.product_name || "-"}</TableCell>
                    <TableCell>{transaction.payment_method === "cash" ? "Tunai" : "Non-Tunai"}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(transaction.total_price))}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(transaction)} disabled={addMutation.isPending}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(transaction.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Belum ada transaksi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span>Tampilkan:</span>
            <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>data per halaman</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              Sebelumnya
            </Button>
            <span>
              Halaman {currentPage} dari {totalPages || 1}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
              Selanjutnya
            </Button>
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
              <AlertDialogDescription>Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
