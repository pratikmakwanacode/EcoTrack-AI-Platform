'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  title?: string;
  isDismissing?: boolean;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType, title?: string) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isDismissing: true } : n))
    );
    // Wait for the exit animation to complete before removing from state
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 200);
  }, []);

  const showNotification = useCallback(
    (message: string, type: NotificationType, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      let defaultTitle = '';
      if (!title) {
        switch (type) {
          case 'success':
            defaultTitle = 'Success';
            break;
          case 'error':
            defaultTitle = 'Error';
            break;
          case 'warning':
            defaultTitle = 'Warning';
            break;
          case 'info':
            defaultTitle = 'Information';
            break;
        }
      }

      setNotifications((prev) => [
        ...prev,
        { id, message, type, title: title || defaultTitle },
      ]);

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        dismissNotification(id);
      }, 4000);

      return () => clearTimeout(timer);
    },
    [dismissNotification]
  );

  return (
    <NotificationContext.Provider value={{ showNotification, dismissNotification }}>
      {children}
      
      {/* Floating notification container */}
      <div className="fixed top-6 right-6 z-[60] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {notifications.map((n) => {
          let cardStyles = '';
          let iconContainerStyles = '';
          let Icon = Info;

          switch (n.type) {
            case 'success':
              cardStyles = 'border-emerald-250 bg-emerald-50 text-emerald-800 shadow-emerald-100/50';
              iconContainerStyles = 'bg-emerald-100 text-emerald-600';
              Icon = CheckCircle2;
              break;
            case 'error':
              cardStyles = 'border-rose-250 bg-rose-50 text-rose-800 shadow-rose-100/50';
              iconContainerStyles = 'bg-rose-100 text-rose-600';
              Icon = XCircle;
              break;
            case 'warning':
              cardStyles = 'border-amber-250 bg-amber-50 text-amber-900 shadow-amber-100/50';
              iconContainerStyles = 'bg-amber-100 text-amber-600';
              Icon = AlertTriangle;
              break;
            case 'info':
              cardStyles = 'border-sky-250 bg-sky-50 text-sky-800 shadow-sky-100/50';
              iconContainerStyles = 'bg-sky-100 text-sky-600';
              Icon = Info;
              break;
          }

          return (
            <div
              key={n.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl transition-all duration-300 max-w-sm ${cardStyles} ${
                n.isDismissing ? 'animate-fade-out' : 'animate-slide-in-right'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${iconContainerStyles}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {n.title && <div className="text-sm font-bold leading-none mb-1">{n.title}</div>}
                <div className="text-xs font-semibold leading-relaxed break-words">{n.message}</div>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="shrink-0 p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
