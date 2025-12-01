/**
 * Schedule Generator dengan Constraint Satisfaction Problem (CSP)
 * 
 * Hard Constraints:
 * 1. Setiap tukang cukur libur maksimal 1x per minggu
 * 2. Setiap hari minimal ada 2 orang kerja
 * 3. Tidak boleh 3 orang libur bersamaan di hari yang sama
 * 
 * Soft Constraints:
 * 1. Distribusi shift merata (balance Full vs Siang)
 * 2. Weekend sebaiknya ada lebih banyak coverage (Full shift)
 * 3. Beban kerja total per tukang cukur seimbang
 */

export type ShiftType = "full" | "siang" | "libur";

export interface Barber {
  id: string;
  name: string;
}

export interface ScheduleEntry {
  barber_id: string;
  barber_name: string;
  schedule_date: string;
  shift: ShiftType;
  day_of_week: number;
  date_display: string;
}

interface DaySchedule {
  date: Date;
  dayOfWeek: number;
  isWeekend: boolean;
  assignments: Map<string, ShiftType>;
}

/**
 * Generate jadwal untuk 1 minggu dengan CSP algorithm
 */
export function generateWeeklySchedule(
  barbers: Barber[],
  startDate: Date
): ScheduleEntry[] {
  if (barbers.length < 2) {
    throw new Error("Minimal harus ada 2 tukang cukur");
  }

  const schedule: DaySchedule[] = [];
  const DAYS_IN_WEEK = 7;

  // Initialize schedule structure
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dayOfWeek = date.getDay();

    schedule.push({
      date: new Date(date),
      dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      assignments: new Map(),
    });
  }

  // Step 1: Assign day-off menggunakan rotating pattern
  assignDayOffs(barbers, schedule);

  // Step 2: Fill remaining shifts dengan balanced distribution
  fillRemainingShifts(barbers, schedule);

  // Step 3: Validate dan adjust jika perlu
  if (!validateSchedule(schedule, barbers)) {
    // Try to fix violations
    adjustScheduleForConstraints(schedule, barbers);
  }

  // Convert to ScheduleEntry format
  return convertToScheduleEntries(schedule, barbers);
}

/**
 * Assign hari libur untuk setiap barber dengan rotating pattern
 */
function assignDayOffs(barbers: Barber[], schedule: DaySchedule[]): void {
  const weekNumber = getWeekNumber(schedule[0].date);
  
  barbers.forEach((barber, index) => {
    // Rotating day-off pattern
    // Barber 0: Senin (week 1), Kamis (week 2), Minggu (week 3), dst
    // Barber 1: Rabu (week 1), Sabtu (week 2), Selasa (week 3), dst
    // Pattern memastikan tidak ada 3 orang libur bersamaan
    
    let dayOffIndex = (index * 2 + weekNumber) % 7;
    
    // Pastikan tidak lebih dari 1 orang libur per hari (untuk barber <= 3)
    let attempts = 0;
    while (attempts < 7) {
      const daySchedule = schedule[dayOffIndex];
      const libursToday = Array.from(daySchedule.assignments.values())
        .filter(shift => shift === "libur").length;
      
      // Jika sudah ada 1 orang libur dan total barber = 3, cari hari lain
      if (barbers.length === 3 && libursToday >= 1) {
        dayOffIndex = (dayOffIndex + 1) % 7;
        attempts++;
      } else {
        break;
      }
    }
    
    schedule[dayOffIndex].assignments.set(barber.id, "libur");
  });
}

/**
 * Fill shift yang belum di-assign (selain libur)
 */
function fillRemainingShifts(barbers: Barber[], schedule: DaySchedule[]): void {
  schedule.forEach((daySchedule) => {
    barbers.forEach((barber) => {
      // Skip jika sudah di-assign (libur)
      if (daySchedule.assignments.has(barber.id)) {
        return;
      }

      let shift: ShiftType;

      if (daySchedule.isWeekend) {
        // Weekend priority: lebih banyak Full shift
        shift = "full";
      } else {
        // Weekday: alternating Full/Siang untuk balance
        // Gunakan kombinasi hari dan barber index untuk variasi
        const shouldBeFull = (daySchedule.dayOfWeek + barbers.indexOf(barber)) % 2 === 0;
        shift = shouldBeFull ? "full" : "siang";
      }

      daySchedule.assignments.set(barber.id, shift);
    });
  });
}

/**
 * Validate schedule terhadap hard constraints
 */
function validateSchedule(schedule: DaySchedule[], barbers: Barber[]): boolean {
  // Check 1: Setiap tukang cukur max 1x libur per minggu
  const dayOffCount = new Map<string, number>();
  
  schedule.forEach((day) => {
    day.assignments.forEach((shift, barberId) => {
      if (shift === "libur") {
        dayOffCount.set(barberId, (dayOffCount.get(barberId) || 0) + 1);
      }
    });
  });

  for (const count of dayOffCount.values()) {
    if (count > 1) {
      return false; // Violation: ada yang libur lebih dari 1x
    }
  }

  // Check 2: Setiap hari minimal 2 orang kerja
  for (const day of schedule) {
    const workingCount = Array.from(day.assignments.values())
      .filter(shift => shift !== "libur").length;
    
    if (workingCount < 2) {
      return false; // Violation: kurang coverage
    }
  }

  // Check 3: Tidak boleh semua libur di hari yang sama
  for (const day of schedule) {
    const liburCount = Array.from(day.assignments.values())
      .filter(shift => shift === "libur").length;
    
    if (liburCount >= barbers.length) {
      return false; // Violation: semua libur
    }
  }

  return true;
}

/**
 * Adjust schedule untuk memenuhi constraints
 */
function adjustScheduleForConstraints(schedule: DaySchedule[], barbers: Barber[]): void {
  // Find violations dan fix
  schedule.forEach((day) => {
    const workingCount = Array.from(day.assignments.values())
      .filter(shift => shift !== "libur").length;
    
    // Jika kurang dari 2 orang kerja, ubah salah satu libur jadi siang
    if (workingCount < 2) {
      for (const [barberId, shift] of day.assignments) {
        if (shift === "libur") {
          day.assignments.set(barberId, "siang");
          break; // Fix satu aja cukup
        }
      }
    }
  });
}

/**
 * Convert DaySchedule ke ScheduleEntry format untuk database
 */
function convertToScheduleEntries(
  schedule: DaySchedule[],
  barbers: Barber[]
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  schedule.forEach((day) => {
    day.assignments.forEach((shift, barberId) => {
      const barber = barbers.find(b => b.id === barberId);
      if (!barber) return;

      entries.push({
        barber_id: barberId,
        barber_name: barber.name,
        schedule_date: day.date.toISOString().split("T")[0],
        shift,
        day_of_week: day.dayOfWeek,
        date_display: day.date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
        }),
      });
    });
  });

  return entries;
}

/**
 * Get week number in year
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Get statistics dari generated schedule
 */
export function getScheduleStatistics(schedule: ScheduleEntry[]) {
  const barberStats = new Map<string, {
    name: string;
    fullShifts: number;
    siangShifts: number;
    dayOffs: number;
    totalWorkDays: number;
  }>();

  schedule.forEach((entry) => {
    if (!barberStats.has(entry.barber_id)) {
      barberStats.set(entry.barber_id, {
        name: entry.barber_name,
        fullShifts: 0,
        siangShifts: 0,
        dayOffs: 0,
        totalWorkDays: 0,
      });
    }

    const stats = barberStats.get(entry.barber_id)!;
    
    if (entry.shift === "full") {
      stats.fullShifts++;
      stats.totalWorkDays++;
    } else if (entry.shift === "siang") {
      stats.siangShifts++;
      stats.totalWorkDays++;
    } else if (entry.shift === "libur") {
      stats.dayOffs++;
    }
  });

  return Array.from(barberStats.values());
}

/**
 * Validate generated schedule sebelum save
 */
export function validateGeneratedSchedule(
  schedule: ScheduleEntry[],
  barbers: Barber[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Group by date
  const byDate = new Map<string, ScheduleEntry[]>();
  schedule.forEach((entry) => {
    if (!byDate.has(entry.schedule_date)) {
      byDate.set(entry.schedule_date, []);
    }
    byDate.get(entry.schedule_date)!.push(entry);
  });

  // Check each day
  byDate.forEach((entries, date) => {
    const workingCount = entries.filter(e => e.shift !== "libur").length;
    if (workingCount < 2) {
      errors.push(`Tanggal ${date}: Kurang coverage (hanya ${workingCount} orang kerja)`);
    }
  });

  // Check each barber
  barbers.forEach((barber) => {
    const barberEntries = schedule.filter(e => e.barber_id === barber.id);
    const dayOffs = barberEntries.filter(e => e.shift === "libur").length;
    
    if (dayOffs > 1) {
      errors.push(`${barber.name}: Libur lebih dari 1x (${dayOffs} hari)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

