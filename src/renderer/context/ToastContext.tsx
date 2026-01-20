import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';
import ConfirmModal from '../components/common/ConfirmModal';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ToastContextType {
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: string) => Promise<void>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({ isOpen: false, options: { title: '', message: '' } });
  
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ isOpen: true, options });
    });
  }, []);

  const alert = useCallback((title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = () => resolve();
      setConfirmState({ 
        isOpen: true, 
        options: { 
          title, 
          message, 
          confirmLabel: 'OK', 
          cancelLabel: '', 
          variant: 'info' 
        } 
      });
    });
  }, []);

  const handleConfirm = () => {
    confirmResolveRef.current?.(true);
    setConfirmState({ isOpen: false, options: { title: '', message: '' } });
  };

  const handleCancel = () => {
    confirmResolveRef.current?.(false);
    setConfirmState({ isOpen: false, options: { title: '', message: '' } });
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, confirm, alert }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmLabel={confirmState.options.confirmLabel}
        cancelLabel={confirmState.options.cancelLabel}
        variant={confirmState.options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
