import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
}

export function useNotification() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false
  });
  const notificationRef = useRef<Notification | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setState({
        permission: Notification.permission,
        isSupported: true
      });
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    
    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      return permission === 'granted';
    } catch (e) {
      console.error('Bildirim izni hatası:', e);
      return false;
    }
  }, []);

  // Kalıcı bildirim göster
  const showPersistentNotification = useCallback((steps: number, goal: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Önceki bildirimi kapat
    if (notificationRef.current) {
      notificationRef.current.close();
    }

    const percentage = Math.round((steps / goal) * 100);
    const remaining = Math.max(0, goal - steps);
    const goalReached = steps >= goal;

    try {
      notificationRef.current = new Notification(
        goalReached ? '🎉 Hedefe Ulaştın!' : '👟 AdımSayar',
        {
          body: goalReached 
            ? `${steps.toLocaleString()} adım attın! Tebrikler!`
            : `${steps.toLocaleString()} / ${goal.toLocaleString()} adım (${percentage}%) - ${remaining.toLocaleString()} adım kaldı`,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'step-counter', // Aynı bildirim güncellenir
          requireInteraction: true, // Kalıcı bildirim
          silent: false
        } as NotificationOptions
      );
    } catch (e) {
      console.error('Bildirim gösterme hatası:', e);
    }
  }, []);

  // Periyodik bildirim güncelleme
  const startNotificationUpdates = useCallback((getSteps: () => number, getGoal: () => number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = window.setInterval(() => {
      const steps = getSteps();
      const goal = getGoal();
      showPersistentNotification(steps, goal);
    }, 60000); // Her dakika güncelle
  }, [showPersistentNotification]);

  const stopNotificationUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
  }, []);

  // Hedefe ulaşınca bildirim
  const notifyGoalReached = useCallback((steps: number) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      new Notification('🎉 Tebrikler!', {
        body: `Hedefine ulaştın! ${steps.toLocaleString()} adım attın!`,
        icon: '/icon.svg',
        tag: 'goal-reached'
      });
    } catch (e) {
      console.error('Bildirim hatası:', e);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (notificationRef.current) notificationRef.current.close();
    };
  }, []);

  return {
    ...state,
    requestPermission,
    showPersistentNotification,
    startNotificationUpdates,
    stopNotificationUpdates,
    notifyGoalReached
  };
}
