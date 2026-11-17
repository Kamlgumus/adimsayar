import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UserProfile, 
  calculateCalories, 
  calculateDistance, 
  saveDailyStats, 
  getTodayStats,
  loadProfile 
} from '../utils/calculations';

interface StepCounterState {
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  isTracking: boolean;
  sensorAvailable: boolean;
  speed: number;
  lastStepTime: number;
}

// Eşik değeri - ivmeölçer hassasiyeti
const STEP_THRESHOLD = 12;
const STEP_COOLDOWN = 300; // ms - minimum adım aralığı
const ACCEL_LOW_PASS = 0.1; // Düşük geçiş filtresi katsayısı

export function useStepCounter() {
  const [state, setState] = useState<StepCounterState>({
    steps: 0,
    distance: 0,
    calories: 0,
    activeMinutes: 0,
    isTracking: false,
    sensorAvailable: false,
    speed: 0,
    lastStepTime: 0
  });

  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const lastStepTimeRef = useRef(0);
  const stepsRef = useRef(0);
  const startTimeRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const stepTimestampsRef = useRef<number[]>([]);
  const filteredAccelRef = useRef(0);
  const peakDetectedRef = useRef(false);

  // Bugünün verilerini yükle
  useEffect(() => {
    const todayStats = getTodayStats();
    const profile = loadProfile();
    profileRef.current = profile;
    
    setState(prev => ({
      ...prev,
      steps: todayStats.steps,
      distance: todayStats.distance,
      calories: todayStats.calories,
      activeMinutes: todayStats.activeMinutes
    }));
    stepsRef.current = todayStats.steps;
  }, []);

  // Sensör dinleyici
  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.x === null || accel.y === null || accel.z === null) return;

    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    // Düşük geçiş filtresi - gürültüyü azalt
    filteredAccelRef.current = ACCEL_LOW_PASS * 
      Math.sqrt(x * x + y * y + z * z) + 
      (1 - ACCEL_LOW_PASS) * filteredAccelRef.current;

    // Filtrelenmiş ivme değerinden yerçekimini çıkar (~9.8)
    const magnitude = filteredAccelRef.current - 9.8;
    const absMagnitude = Math.abs(magnitude);

    const now = Date.now();
    const timeSinceLastStep = now - lastStepTimeRef.current;

    // Adım tespiti - tepe noktası algılama
    if (absMagnitude > STEP_THRESHOLD && timeSinceLastStep > STEP_COOLDOWN) {
      if (!peakDetectedRef.current) {
        peakDetectedRef.current = true;
        
        // Adım kaydet
        stepsRef.current += 1;
        lastStepTimeRef.current = now;
        stepTimestampsRef.current.push(now);
        
        // Son 60 saniyedeki adımları tut
        const oneMinuteAgo = now - 60000;
        stepTimestampsRef.current = stepTimestampsRef.current.filter(t => t > oneMinuteAgo);

        // Güncelle
        const profile = profileRef.current;
        const strideLength = profile ? profile.strideLength : 0.7;
        const weight = profile ? profile.weight : 70;
        const gender = profile ? profile.gender : 'male' as const;
        const age = profile ? profile.age : 30;
        
        const distance = calculateDistance(stepsRef.current, strideLength);
        const elapsedMinutes = startTimeRef.current > 0 ? (now - startTimeRef.current) / 60000 : 0;
        const calories = calculateCalories(stepsRef.current, weight, gender, age, elapsedMinutes);
        const speed = elapsedMinutes > 0 ? (distance / elapsedMinutes) * 60 : 0;

        setState(prev => ({
          ...prev,
          steps: stepsRef.current,
          distance: Math.round(distance * 1000) / 1000,
          calories,
          activeMinutes: Math.round(elapsedMinutes),
          speed: Math.round(speed * 10) / 10
        }));
      }
    } else if (absMagnitude < STEP_THRESHOLD * 0.5) {
      peakDetectedRef.current = false;
    }

    lastAccelRef.current = { x, y, z };
  }, []);

  // Verileri kaydetme intervali
  const startSaveInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const profile = profileRef.current;
      const strideLength = profile ? profile.strideLength : 0.7;
      const today = new Date().toISOString().split('T')[0];
      
      saveDailyStats({
        date: today,
        steps: stepsRef.current,
        distance: calculateDistance(stepsRef.current, strideLength),
        calories: state.calories,
        activeMinutes: state.activeMinutes,
        goal: 10000
      });
    }, 30000); // Her 30 saniyede kaydet
  }, [state.calories, state.activeMinutes]);

  // Takibi başlat
  const startTracking = useCallback(async () => {
    // Sensör desteğini kontrol et
    if (!window.DeviceMotionEvent) {
      setState(prev => ({ ...prev, sensorAvailable: false }));
      return false;
    }

    // iOS 13+ için izin iste
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          setState(prev => ({ ...prev, sensorAvailable: false }));
          return false;
        }
      } catch (e) {
        console.error('Sensör izni reddedildi:', e);
        setState(prev => ({ ...prev, sensorAvailable: false }));
        return false;
      }
    }

    startTimeRef.current = Date.now();
    window.addEventListener('devicemotion', handleMotion);
    
    setState(prev => ({ ...prev, isTracking: true, sensorAvailable: true }));
    startSaveInterval();
    return true;
  }, [handleMotion, startSaveInterval]);

  // Takibi durdur
  const stopTracking = useCallback(() => {
    window.removeEventListener('devicemotion', handleMotion);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isTracking: false }));
    
    // Son kaydetme
    const profile = profileRef.current;
    const strideLength = profile ? profile.strideLength : 0.7;
    const today = new Date().toISOString().split('T')[0];
    saveDailyStats({
      date: today,
      steps: stepsRef.current,
      distance: calculateDistance(stepsRef.current, strideLength),
      calories: state.calories,
      activeMinutes: state.activeMinutes,
      goal: 10000
    });
  }, [handleMotion, state.calories, state.activeMinutes]);

  // Adım sayısını sıfırla (yeni gün)
  const resetDaily = useCallback(() => {
    stepsRef.current = 0;
    startTimeRef.current = Date.now();
    stepTimestampsRef.current = [];
    setState(prev => ({
      ...prev,
      steps: 0,
      distance: 0,
      calories: 0,
      activeMinutes: 0,
      speed: 0
    }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [handleMotion]);

  return {
    ...state,
    startTracking,
    stopTracking,
    resetDaily
  };
}
