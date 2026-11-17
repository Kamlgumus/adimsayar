// Adımsayar sabitleri ve hesaplama fonksiyonları

export interface UserProfile {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  strideLength: number; // metre
}

export interface DailyStats {
  date: string;
  steps: number;
  distance: number; // km
  calories: number;
  activeMinutes: number;
  goal: number;
}

export interface ActivitySession {
  startTime: number;
  endTime: number;
  steps: number;
  distance: number;
  calories: number;
}

// Adım uzunluğunu boy bazlı hesapla
export function calculateStrideLength(height: number): number {
  return height * 0.415 / 100; // metre cinsinden
}

// Kalori hesaplama (MET değeri tabanlı)
export function calculateCalories(
  steps: number,
  weight: number,
  gender: 'male' | 'female',
  age: number,
  durationMinutes: number
): number {
  // Yürüyüş MET değeri: ~3.5
  const MET = 3.5;
  const durationHours = durationMinutes / 60;
  
  if (durationHours <= 0) return 0;
  
  // Basit kalori formülü: MET * kilo * süre(saat)
  let calories = MET * weight * durationHours;
  
  // Cinsiyet düzeltmesi
  if (gender === 'female') {
    calories *= 0.9;
  }
  
  // Yaş düzeltmesi
  if (age > 50) {
    calories *= 0.9;
  } else if (age < 25) {
    calories *= 1.1;
  }
  
  return Math.round(calories);
}

// Mesafe hesaplama
export function calculateDistance(steps: number, strideLength: number): number {
  return (steps * strideLength) / 1000; // km cinsinden
}

// Hız hesaplama (km/saat)
export function calculateSpeed(distance: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return (distance / minutes) * 60;
}

// Tempo hesaplama (dk/km)
export function calculatePace(distance: number, minutes: number): string {
  if (distance <= 0) return "0:00";
  const pace = minutes / distance;
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Günlük hedef önerisi
export function suggestGoal(age: number, gender: 'male' | 'female'): number {
  if (age < 18) return 8000;
  if (age < 40) return gender === 'male' ? 12000 : 10000;
  if (age < 60) return 10000;
  return 8000;
}

// LocalStorage helpers
export function saveProfile(profile: UserProfile): void {
  localStorage.setItem('stepcounter_profile', JSON.stringify(profile));
}

export function loadProfile(): UserProfile | null {
  const data = localStorage.getItem('stepcounter_profile');
  return data ? JSON.parse(data) : null;
}

export function saveDailyStats(stats: DailyStats): void {
  const allStats = loadAllStats();
  const existingIndex = allStats.findIndex(s => s.date === stats.date);
  if (existingIndex >= 0) {
    allStats[existingIndex] = stats;
  } else {
    allStats.push(stats);
  }
  // Son 90 günü tut
  const sorted = allStats.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
  localStorage.setItem('stepcounter_stats', JSON.stringify(sorted));
}

export function loadAllStats(): DailyStats[] {
  const data = localStorage.getItem('stepcounter_stats');
  return data ? JSON.parse(data) : [];
}

export function getTodayStats(): DailyStats {
  const today = new Date().toISOString().split('T')[0];
  const allStats = loadAllStats();
  const todayStats = allStats.find(s => s.date === today);
  
  const profile = loadProfile();
  const defaultGoal = profile ? suggestGoal(profile.age, profile.gender) : 10000;
  
  return todayStats || {
    date: today,
    steps: 0,
    distance: 0,
    calories: 0,
    activeMinutes: 0,
    goal: defaultGoal
  };
}

export function saveGoal(goal: number): void {
  localStorage.setItem('stepcounter_goal', goal.toString());
}

export function loadGoal(): number {
  const data = localStorage.getItem('stepcounter_goal');
  return data ? parseInt(data) : 10000;
}

export function getWeekStats(): DailyStats[] {
  const allStats = loadAllStats();
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  
  return allStats.filter(s => s.date >= weekAgoStr).sort((a, b) => a.date.localeCompare(b.date));
}

export function getMonthStats(): DailyStats[] {
  const allStats = loadAllStats();
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthAgoStr = monthAgo.toISOString().split('T')[0];
  
  return allStats.filter(s => s.date >= monthAgoStr).sort((a, b) => a.date.localeCompare(b.date));
}
