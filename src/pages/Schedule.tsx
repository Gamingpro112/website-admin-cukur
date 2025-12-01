import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateWeeklySchedule, validateGeneratedSchedule, getScheduleStatistics, type ScheduleEntry } from "@/lib/scheduleGenerator";

interface Barber {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  barber_id: string;
  schedule_date: string;
  shift: "full" | "siang" | "libur";
  barbers: Barber;
}

type ShiftType = "full" | "siang" | "libur";

const shiftLabels: Record<ShiftType, string> = {
  full: "Full (09:45-21:00)",
  siang: "Siang (12:30-21:00)",
  libur: "Libur",
};

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const Schedule = () => {
  const { userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [barberId, setBarberId] = useState("");
  const [shift, setShift] = useState<ShiftType>("full");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<ScheduleEntry[]>([]);
  const [generateStartDate, setGenerateStartDate] = useState("");
  const queryClient = useQueryClient();

  const isOwner = userRole === "owner";

  // Fetch all barbers
  const { data: barbers } = useQuery({
    queryKey: ["barbers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbers").select("*").order("name");
      if (error) throw error;
      return data as Barber[];
    },
  });

  // Fetch schedules for current month
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["schedules", currentMonth.getFullYear(), currentMonth.getMonth()],
    queryFn: async () => {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data, error } = await (supabase as any)
        .from("barber_schedules")
        .select("*, barbers(id, name)")
        .gte("schedule_date", startDate.toISOString().split("T")[0])
        .lte("schedule_date", endDate.toISOString().split("T")[0])
        .order("schedule_date");
      if (error) throw error;
      return data as Schedule[];
    },
  });

  // Add/Update schedule mutation
  const saveMutation = useMutation({
    mutationFn: async (scheduleData: {
      barber_id: string;
      schedule_date: string;
      shift: ShiftType;
    }) => {
      // Check if schedule exists
      const { data: existing } = await (supabase as any)
        .from("barber_schedules")
        .select("id")
        .eq("barber_id", scheduleData.barber_id)
        .eq("schedule_date", scheduleData.schedule_date)
        .single();

      if (existing) {
        // Update existing
        const { error } = await (supabase as any)
          .from("barber_schedules")
          .update({ shift: scheduleData.shift })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await (supabase as any).from("barber_schedules").insert(scheduleData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Jadwal berhasil disimpan");
      resetForm();
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan jadwal");
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ barberId, date }: { barberId: string; date: string }) => {
      const { error } = await (supabase as any)
        .from("barber_schedules")
        .delete()
        .eq("barber_id", barberId)
        .eq("schedule_date", date);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Jadwal berhasil dihapus");
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menghapus jadwal");
    },
  });

  // Bulk insert schedules mutation
  const bulkInsertMutation = useMutation({
    mutationFn: async (schedules: ScheduleEntry[]) => {
      // Convert ScheduleEntry to database format
      const insertData = schedules.map(s => ({
        barber_id: s.barber_id,
        schedule_date: s.schedule_date,
        shift: s.shift,
      }));

      // Upsert to handle conflicts
      const { error } = await (supabase as any)
        .from("barber_schedules")
        .upsert(insertData, {
          onConflict: "barber_id,schedule_date",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Jadwal berhasil diterapkan!");
      setIsGenerateDialogOpen(false);
      setGeneratedSchedule([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal menyimpan jadwal");
    },
  });

  const resetForm = () => {
    setSelectedDate("");
    setBarberId("");
    setShift("full");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barberId || !selectedDate || !shift) {
      toast.error("Semua field harus diisi");
      return;
    }

    saveMutation.mutate({
      barber_id: barberId,
      schedule_date: selectedDate,
      shift: shift,
    });
  };

  const handleGenerateSchedule = () => {
    if (!generateStartDate) {
      toast.error("Pilih tanggal mulai minggu terlebih dahulu");
      return;
    }

    if (!barbers || barbers.length < 2) {
      toast.error("Minimal harus ada 2 tukang cukur untuk generate jadwal");
      return;
    }

    try {
      const startDate = new Date(generateStartDate);
      
      // Generate schedule menggunakan CSP algorithm
      const generated = generateWeeklySchedule(barbers, startDate);
      
      // Validate generated schedule
      const validation = validateGeneratedSchedule(generated, barbers);
      
      if (!validation.valid) {
        toast.error("Jadwal yang di-generate tidak valid: " + validation.errors.join(", "));
        return;
      }

      setGeneratedSchedule(generated);
      toast.success("Jadwal berhasil di-generate! Silakan preview dan apply.");
    } catch (error: any) {
      toast.error(error.message || "Gagal generate jadwal");
    }
  };

  const handleApplySchedule = () => {
    if (generatedSchedule.length === 0) {
      toast.error("Tidak ada jadwal untuk diterapkan");
      return;
    }

    bulkInsertMutation.mutate(generatedSchedule);
  };

  const handleCancelGenerate = () => {
    setGeneratedSchedule([]);
    setGenerateStartDate("");
    setIsGenerateDialogOpen(false);
  };

  // Generate days for the current month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }, [currentMonth]);

  // Group schedules by date and barber
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Map<string, ShiftType>>();
    
    schedules?.forEach((schedule) => {
      const dateKey = schedule.schedule_date;
      if (!map.has(dateKey)) {
        map.set(dateKey, new Map());
      }
      map.get(dateKey)!.set(schedule.barber_id, schedule.shift);
    });

    return map;
  }, [schedules]);

  const getShiftForBarberOnDate = (barberId: string, date: Date): ShiftType | null => {
    const dateKey = date.toISOString().split("T")[0];
    return scheduleMap.get(dateKey)?.get(barberId) || null;
  };

  const handleCellClick = (barberId: string, date: Date) => {
    if (!isOwner) return;
    
    const dateStr = date.toISOString().split("T")[0];
    const currentShift = getShiftForBarberOnDate(barberId, date);
    
    setBarberId(barberId);
    setSelectedDate(dateStr);
    setShift(currentShift || "full");
    setIsOpen(true);
  };

  const handleDeleteCell = (barberId: string, date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    
    const dateStr = date.toISOString().split("T")[0];
    if (confirm("Hapus jadwal ini?")) {
      deleteMutation.mutate({ barberId, date: dateStr });
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const getShiftBadge = (shift: ShiftType) => {
    if (shift === "full") {
      return <Badge className="bg-green-600 hover:bg-green-700">Full</Badge>;
    } else if (shift === "siang") {
      return <Badge className="bg-blue-600 hover:bg-blue-700">Siang</Badge>;
    } else {
      return <Badge variant="secondary">Libur</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Jadwal Tukang Cukur</h1>
            <p className="text-muted-foreground">
              {isOwner ? "Kelola jadwal kerja tukang cukur" : "Lihat jadwal kerja tukang cukur"}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {isOwner && (
              <Button 
                onClick={() => setIsGenerateDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Jadwal Otomatis
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToCurrentMonth}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {currentMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 items-center bg-muted p-4 rounded-lg">
          <span className="font-medium">Keterangan:</span>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600">Full</Badge>
            <span className="text-sm">09:45-21:00</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600">Siang</Badge>
            <span className="text-sm">12:30-21:00</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Libur</Badge>
            <span className="text-sm">Hari Libur</span>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-card rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] sticky left-0 bg-card z-10">Tanggal</TableHead>
                <TableHead className="w-[100px] sticky left-[100px] bg-card z-10">Hari</TableHead>
                {barbers?.map((barber) => (
                  <TableHead key={barber.id} className="text-center min-w-[120px]">
                    {barber.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={(barbers?.length || 0) + 2} className="text-center text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : daysInMonth.length > 0 ? (
                daysInMonth.map((date) => (
                  <TableRow key={date.toISOString()}>
                    <TableCell className="font-medium sticky left-0 bg-card">
                      {date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" })}
                    </TableCell>
                    <TableCell className="sticky left-[100px] bg-card">
                      {dayNames[date.getDay()]}
                    </TableCell>
                    {barbers?.map((barber) => {
                      const shift = getShiftForBarberOnDate(barber.id, date);
                      return (
                        <TableCell
                          key={barber.id}
                          className={`text-center ${
                            isOwner ? "cursor-pointer hover:bg-muted transition-colors" : ""
                          }`}
                          onClick={() => handleCellClick(barber.id, date)}
                          onDoubleClick={(e) => shift && handleDeleteCell(barber.id, date, e)}
                        >
                          {shift ? (
                            <div className="flex justify-center">
                              {getShiftBadge(shift)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={(barbers?.length || 0) + 2} className="text-center text-muted-foreground">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {isOwner && (
          <div className="text-sm text-muted-foreground">
            💡 Tip: Klik pada sel untuk mengatur jadwal. Double-click untuk menghapus jadwal.
          </div>
        )}

        {/* Dialog for editing schedule */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atur Jadwal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barber">Tukang Cukur</Label>
                <Select value={barberId} onValueChange={setBarberId} required>
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
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <Select value={shift} onValueChange={(value) => setShift(value as ShiftType)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{shiftLabels.full}</SelectItem>
                    <SelectItem value="siang">{shiftLabels.siang}</SelectItem>
                    <SelectItem value="libur">{shiftLabels.libur}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan Jadwal"}
                </Button>
                {selectedDate && barberId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={(e) => {
                      const date = new Date(selectedDate);
                      handleDeleteCell(barberId, date, e as any);
                      setIsOpen(false);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog for generate schedule */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Generate Jadwal Otomatis
              </DialogTitle>
              <DialogDescription>
                Buat jadwal mingguan otomatis menggunakan algoritma Constraint Satisfaction Problem (CSP)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Input Section */}
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aturan Generate Jadwal:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Setiap tukang cukur libur maksimal 1x per minggu</li>
                      <li>Setiap hari minimal ada 2 orang kerja</li>
                      <li>Distribusi shift Full dan Siang merata</li>
                      <li>Weekend prioritas shift Full</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="generateStartDate">Tanggal Mulai Minggu</Label>
                  <Input
                    id="generateStartDate"
                    type="date"
                    value={generateStartDate}
                    onChange={(e) => setGenerateStartDate(e.target.value)}
                    placeholder="Pilih hari Senin minggu yang akan di-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Pilih hari Senin untuk hasil terbaik
                  </p>
                </div>

                <Button 
                  onClick={handleGenerateSchedule}
                  className="w-full"
                  disabled={!generateStartDate || !barbers || barbers.length < 2}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Jadwal
                </Button>
              </div>

              {/* Preview Section */}
              {generatedSchedule.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Preview Jadwal</h3>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {generatedSchedule.length} jadwal di-generate
                    </Badge>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {getScheduleStatistics(generatedSchedule).map((stats) => (
                      <div key={stats.name} className="p-4 bg-muted rounded-lg space-y-2">
                        <p className="font-medium">{stats.name}</p>
                        <div className="text-sm space-y-1">
                          <p>Full: {stats.fullShifts}x | Siang: {stats.siangShifts}x</p>
                          <p>Libur: {stats.dayOffs}x | Total Kerja: {stats.totalWorkDays} hari</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview Table */}
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Hari</TableHead>
                          {barbers?.map((barber) => (
                            <TableHead key={barber.id} className="text-center">
                              {barber.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(new Set(generatedSchedule.map(s => s.schedule_date)))
                          .sort()
                          .map((date) => {
                            const daySchedules = generatedSchedule.filter(s => s.schedule_date === date);
                            const firstSchedule = daySchedules[0];
                            
                            return (
                              <TableRow key={date}>
                                <TableCell className="font-medium">
                                  {firstSchedule.date_display}
                                </TableCell>
                                <TableCell>
                                  {dayNames[firstSchedule.day_of_week]}
                                </TableCell>
                                {barbers?.map((barber) => {
                                  const schedule = daySchedules.find(s => s.barber_id === barber.id);
                                  return (
                                    <TableCell key={barber.id} className="text-center">
                                      {schedule && getShiftBadge(schedule.shift)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Action Buttons */}
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCancelGenerate}
                      disabled={bulkInsertMutation.isPending}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleApplySchedule}
                      disabled={bulkInsertMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {bulkInsertMutation.isPending ? "Menerapkan..." : "✓ Terapkan Jadwal"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Schedule;
