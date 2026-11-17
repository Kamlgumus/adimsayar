import { useState, useEffect, useCallback, useRef } from 'react';
import { useStepCounter } from './hooks/useStepCounter';
import { useNotification } from './hooks/useNotification';
import {
  UserProfile,
  saveProfile,
  loadProfile,
  calculateStrideLength,
  suggestGoal,
  saveGoal,
  loadGoal,
  getWeekStats,
  getMonthStats,
  calculateDistance,
  calculateCalories,
  calculatePace,
  DailyStats
} from './utils/calculations';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

type TabType = 'home' | 'profile' | 'goals' | 'reports';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [goal, setGoal] = useState(10000);
  const [goalReachedNotified, setGoalReachedNotified] = useState(false);
  const prevStepsRef = useRef(0);

  const stepCounter = useStepCounter();
  const notification = useNotification();

  // İlk yükleme
  useEffect(() => {
    const savedProfile = loadProfile();
    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      setShowSetup(true);
    }
    setGoal(loadGoal());
  }, []);

  // Hedefe ulaşınca bildirim
  useEffect(() => {
    if (stepCounter.steps >= goal && prevStepsRef.current < goal && !goalReachedNotified) {
      notification.notifyGoalReached(stepCounter.steps);
      setGoalReachedNotified(true);
    }
    if (stepCounter.steps < goal) {
      setGoalReachedNotified(false);
    }
    prevStepsRef.current = stepCounter.steps;
  }, [stepCounter.steps, goal, goalReachedNotified, notification]);

  // Profil kaydet
  const handleSaveProfile = useCallback((newProfile: UserProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
    setShowSetup(false);
  }, []);

  // Hedef kaydet
  const handleSaveGoal = useCallback((newGoal: number) => {
    saveGoal(newGoal);
    setGoal(newGoal);
  }, []);

  // Takibi başlat
  const handleStartTracking = useCallback(async () => {
    await stepCounter.startTracking();
    if (notification.permission !== 'granted') {
      await notification.requestPermission();
    }
    notification.startNotificationUpdates(
      () => stepCounter.steps,
      () => goal
    );
  }, [stepCounter, notification, goal]);

  const progress = Math.min(100, (stepCounter.steps / goal) * 100);

  if (showSetup) {
    return <ProfileSetup onSave={handleSaveProfile} />;
  }

  return (
    <div className="h-full w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-emerald-400">👟 AdımSayar</h1>
          <p className="text-xs text-slate-400">
            {stepCounter.isTracking ? '🟢 Takip aktif' : '🔴 Takip durduruldu'}
          </p>
        </div>
        {!stepCounter.isTracking ? (
          <button
            onClick={handleStartTracking}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
          >
            ▶ Başlat
          </button>
        ) : (
          <button
            onClick={stepCounter.stopTracking}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
          >
            ⏸ Durdur
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && (
          <HomeTab
            steps={stepCounter.steps}
            goal={goal}
            progress={progress}
            distance={stepCounter.distance}
            calories={stepCounter.calories}
            activeMinutes={stepCounter.activeMinutes}
            speed={stepCounter.speed}
            profile={profile}
            sensorAvailable={stepCounter.sensorAvailable}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab profile={profile} onSave={handleSaveProfile} />
        )}
        {activeTab === 'goals' && (
          <GoalsTab goal={goal} steps={stepCounter.steps} onSave={handleSaveGoal} />
        )}
        {activeTab === 'reports' && <ReportsTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 flex">
        <TabButton icon="🏠" label="Ana Sayfa" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <TabButton icon="👤" label="Profil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        <TabButton icon="🎯" label="Hedef" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
        <TabButton icon="📊" label="Rapor" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
      </nav>
    </div>
  );
}

// Tab Button Component
function TabButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
        active ? 'text-emerald-400' : 'text-slate-400'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

// Home Tab
function HomeTab({ steps, goal, progress, distance, calories, activeMinutes, speed, profile, sensorAvailable }: {
  steps: number;
  goal: number;
  progress: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  speed: number;
  profile: UserProfile | null;
  sensorAvailable: boolean;
}) {
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Sensor Warning */}
      {!sensorAvailable && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 text-sm text-amber-300">
          ⚠️ Hareket sensörü algılanamadı. Adım sayımı için "Başlat" butonuna basın ve sensör iznini verin.
        </div>
      )}

      {/* Step Circle */}
      <div className="flex justify-center">
        <div className="relative w-56 h-56">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white">{steps.toLocaleString()}</span>
            <span className="text-sm text-slate-400 mt-1">adım</span>
            <span className="text-xs text-emerald-400 mt-1">%{Math.round(progress)} tamamlandı</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="📏" label="Mesafe" value={`${distance.toFixed(2)} km`} color="blue" />
        <StatCard icon="🔥" label="Kalori" value={`${calories} kcal`} color="orange" />
        <StatCard icon="⏱️" label="Aktif Süre" value={`${activeMinutes} dk`} color="purple" />
        <StatCard icon="💨" label="Hız" value={`${speed.toFixed(1)} km/s`} color="cyan" />
      </div>

      {/* Additional Info */}
      {profile && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Detaylar</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Tempo</span>
            <span className="text-white">
              {activeMinutes > 0 && distance > 0 ? calculatePace(distance, activeMinutes) + ' dk/km' : '--'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Adım Uzunluğu</span>
            <span className="text-white">{(profile.strideLength * 100).toFixed(0)} cm</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Hedef Kalan</span>
            <span className="text-emerald-400">
              {Math.max(0, goal - steps).toLocaleString()} adım
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Tahmini Varış</span>
            <span className="text-white">
              {speed > 0 ? `~${Math.round((Math.max(0, goal - steps) * profile.strideLength / 1000) / speed * 60)} dk` : '--'}
            </span>
          </div>
        </div>
      )}

      {/* Notification Button */}
      <button
        onClick={async () => {
          if ('Notification' in window) {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              new Notification('👟 AdımSayar Aktif', {
                body: `${steps.toLocaleString()} / ${goal.toLocaleString()} adım`,
                tag: 'step-counter',
                requireInteraction: true
              });
            }
          }
        }}
        className="w-full bg-slate-700/50 border border-slate-600 rounded-xl p-3 text-sm text-slate-300 flex items-center justify-center gap-2 active:bg-slate-600/50"
      >
        🔔 Kalıcı Bildirim Gönder
      </button>
    </div>
  );
}

// Stat Card
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

// Profile Setup
function ProfileSetup({ onSave }: { onSave: (profile: UserProfile) => void }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const handleSubmit = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a) return;

    const profile: UserProfile = {
      weight: w,
      height: h,
      age: a,
      gender,
      strideLength: calculateStrideLength(h)
    };
    onSave(profile);
  };

  return (
    <div className="h-full w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-emerald-400 mb-2">👟 AdımSayar</h1>
          <p className="text-slate-400 text-sm">Doğru hesaplamalar için bilgilerini gir</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Kilo (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="70"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Boy (cm)</label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="175"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Yaş</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="25"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Cinsiyet</label>
            <div className="flex gap-3">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 py-3 rounded-xl border transition-all ${
                  gender === 'male'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-700/50 border-slate-600 text-slate-400'
                }`}
              >
                👨 Erkek
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 py-3 rounded-xl border transition-all ${
                  gender === 'female'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-700/50 border-slate-600 text-slate-400'
                }`}
              >
                👩 Kadın
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!weight || !height || !age}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:text-slate-400 text-white py-4 rounded-xl font-semibold text-lg transition-all active:scale-95"
        >
          Başla →
        </button>

        <p className="text-xs text-slate-500 text-center">
          Bilgileriniz sadece cihazınızda saklanır. Hiçbir veri sunucuya gönderilmez.
        </p>
      </div>
    </div>
  );
}

// Profile Tab
function ProfileTab({ profile, onSave }: { profile: UserProfile | null; onSave: (p: UserProfile) => void }) {
  const [weight, setWeight] = useState(profile?.weight.toString() || '');
  const [height, setHeight] = useState(profile?.height.toString() || '');
  const [age, setAge] = useState(profile?.age.toString() || '');
  const [gender, setGender] = useState<'male' | 'female'>(profile?.gender || 'male');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a) return;

    const newProfile: UserProfile = {
      weight: w,
      height: h,
      age: a,
      gender,
      strideLength: calculateStrideLength(h)
    };
    onSave(newProfile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <h2 className="text-xl font-bold text-white">👤 Profil Bilgileri</h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Kilo (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Boy (cm)</label>
          <input
            type="number"
            value={height}
            onChange={e => setHeight(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Yaş</label>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Cinsiyet</label>
          <div className="flex gap-3">
            <button
              onClick={() => setGender('male')}
              className={`flex-1 py-3 rounded-xl border transition-all ${
                gender === 'male'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}
            >
              👨 Erkek
            </button>
            <button
              onClick={() => setGender('female')}
              className={`flex-1 py-3 rounded-xl border transition-all ${
                gender === 'female'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}
            >
              👩 Kadın
            </button>
          </div>
        </div>
      </div>

      {profile && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Hesaplanan Değerler</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Adım Uzunluğu</span>
            <span className="text-white">{(profile.strideLength * 100).toFixed(0)} cm</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Önerilen Günlük Hedef</span>
            <span className="text-emerald-400">{suggestGoal(profile.age, profile.gender).toLocaleString()} adım</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">BMI</span>
            <span className="text-white">{(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all active:scale-95 ${
          saved ? 'bg-green-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }`}
      >
        {saved ? '✓ Kaydedildi!' : 'Kaydet'}
      </button>

      {/* Aikela Smartwatch Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300">⌚ Aikela Akıllı Saat</h3>
        <p className="text-xs text-slate-400">
          Aikela marka akıllı saatiniz varsa, Bluetooth üzerinden bağlanarak adım verilerinizi senkronize edebilirsiniz.
          Saat uygulamanızı açın ve "Sağlık Verisi Paylaş" seçeneğini aktif edin.
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
          <span className="text-xs text-yellow-400">Bluetooth bağlantısı bekleniyor...</span>
        </div>
      </div>
    </div>
  );
}

// Goals Tab
function GoalsTab({ goal, steps, onSave }: { goal: number; steps: number; onSave: (g: number) => void }) {
  const [newGoal, setNewGoal] = useState(goal.toString());
  const [saved, setSaved] = useState(false);
  const remaining = Math.max(0, goal - steps);
  const progress = Math.min(100, (steps / goal) * 100);

  const presets = [5000, 7500, 10000, 12000, 15000, 20000];

  const handleSave = () => {
    const g = parseInt(newGoal);
    if (g > 0) {
      onSave(g);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <h2 className="text-xl font-bold text-white">🎯 Hedef Belirleme</h2>

      {/* Current Progress */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">Bugünkü İlerleme</span>
          <span className="text-emerald-400 font-bold">%{Math.round(progress)}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{steps.toLocaleString()} adım atıldı</span>
          <span className="text-slate-400">{remaining.toLocaleString()} adım kaldı</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Hızlı Seçim</h3>
        <div className="grid grid-cols-3 gap-2">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setNewGoal(p.toString())}
              className={`py-3 rounded-xl border text-sm font-semibold transition-all active:scale-95 ${
                parseInt(newGoal) === p
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Goal */}
      <div>
        <label className="text-sm text-slate-300 mb-1 block">Özel Hedef</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={newGoal}
            onChange={e => setNewGoal(e.target.value)}
            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            placeholder="10000"
          />
          <button
            onClick={handleSave}
            className={`px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 ${
              saved ? 'bg-green-500 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {saved ? '✓' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Motivation */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-400 mb-2">💪 Motivasyon</h3>
        <p className="text-xs text-slate-300">
          {goal <= 5000 && "Harika bir başlangıç! Her adım seni sağlığına bir adım daha yaklaştırıyor."}
          {goal > 5000 && goal <= 10000 && "DSÖ günde 10.000 adım öneriyor. Sen de bu hedefe ulaşabilirsin!"}
          {goal > 10000 && goal <= 15000 && "Ambisyonlu bir hedef! Düzenli yürüyüş ile bu hedefe ulaşabilirsin."}
          {goal > 15000 && "Çok yüksek bir hedef! Yavaş yavaş artırmayı düşün. Sabır önemli!"}
        </p>
      </div>

      {/* Info */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">ℹ️ Bilgi</h3>
        <p className="text-xs text-slate-400">
          Hedefine ulaştığında bildirim alacaksın. Kalıcı bildirimde her an kaç adım attığını ve hedefini görebilirsin.
        </p>
      </div>
    </div>
  );
}

// Reports Tab
function ReportsTab() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const weekStats = getWeekStats();
  const monthStats = getMonthStats();
  const stats = period === 'week' ? weekStats : monthStats;

  // Haftalık toplam
  const totalSteps = stats.reduce((sum, s) => sum + s.steps, 0);
  const totalDistance = stats.reduce((sum, s) => sum + s.distance, 0);
  const totalCalories = stats.reduce((sum, s) => sum + s.calories, 0);
  const avgSteps = stats.length > 0 ? Math.round(totalSteps / stats.length) : 0;
  const bestDay = stats.length > 0 ? stats.reduce((best, s) => s.steps > best.steps ? s : best) : null;

  const chartData = stats.map(s => ({
    date: s.date.slice(5), // MM-DD
    steps: s.steps,
    distance: Math.round(s.distance * 100) / 100,
    calories: s.calories
  }));

  return (
    <div className="px-4 py-4 space-y-6">
      <h2 className="text-xl font-bold text-white">📊 Raporlar</h2>

      {/* Period Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPeriod('week')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            period === 'week'
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
              : 'bg-slate-700/50 border border-slate-600 text-slate-400'
          }`}
        >
          Haftalık
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
            period === 'month'
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
              : 'bg-slate-700/50 border border-slate-600 text-slate-400'
          }`}
        >
          Aylık
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="text-xs text-slate-400">Toplam Adım</div>
          <div className="text-lg font-bold text-white">{totalSteps.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="text-xs text-slate-400">Toplam Mesafe</div>
          <div className="text-lg font-bold text-white">{totalDistance.toFixed(1)} km</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="text-xs text-slate-400">Ortalama/Gün</div>
          <div className="text-lg font-bold text-white">{avgSteps.toLocaleString()}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="text-xs text-slate-400">Yakılan Kalori</div>
          <div className="text-lg font-bold text-white">{totalCalories.toLocaleString()} kcal</div>
        </div>
      </div>

      {/* Steps Chart */}
      {chartData.length > 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Adım Grafiği</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="steps" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <p className="text-slate-400">Henüz veri yok. Takibi başlat ve yürümeye başla!</p>
        </div>
      )}

      {/* Distance Chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Mesafe Grafiği (km)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="distance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Best Day */}
      {bestDay && bestDay.steps > 0 && (
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-1">🏆 En İyi Gün</h3>
          <p className="text-white font-bold">{bestDay.steps.toLocaleString()} adım</p>
          <p className="text-xs text-slate-400">{bestDay.date} • {bestDay.distance.toFixed(2)} km • {bestDay.calories} kcal</p>
        </div>
      )}
    </div>
  );
}

export default App;
