import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Global event bus for triggering toasts from anywhere
let toastCounter = 0;
const TOAST_EVENT = 'fieldflow:toast';

export const toast = {
  success: (message, title = 'Success') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { id: ++toastCounter, type: 'success', title, message: String(message || '') },
        })
      );
    }
  },
  error: (message, title = 'Action Failed') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { id: ++toastCounter, type: 'error', title, message: String(message || 'An error occurred') },
        })
      );
    }
  },
  warning: (message, title = 'Attention') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { id: ++toastCounter, type: 'warning', title, message: String(message || '') },
        })
      );
    }
  },
  info: (message, title = 'Information') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { id: ++toastCounter, type: 'info', title, message: String(message || '') },
        })
      );
    }
  },
};

// Expose globally for convenience
if (typeof window !== 'undefined') {
  window.fieldflowToast = toast;
}

export default function ModernToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const newToast = e.detail;
      if (!newToast || !newToast.message) return;

      setToasts((prev) => {
        // Prevent exact duplicates within short time
        const exists = prev.find((t) => t.message === newToast.message && t.type === newToast.type);
        if (exists) return prev;
        return [...prev.slice(-3), { ...newToast, duration: newToast.duration || 4500 }];
      });
    };

    window.addEventListener(TOAST_EVENT, handleToastEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleToastEvent);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        pointerEvents: 'none',
        maxWidth: '92vw',
        width: '460px',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 280);
  };

  const config = {
    success: {
      bg: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(209, 250, 229, 0.95))',
      border: '1px solid #34d399',
      borderGlow: '0 10px 25px -5px rgba(16, 185, 129, 0.35), 0 8px 10px -6px rgba(16, 185, 129, 0.2)',
      icon: <CheckCircle2 size={24} color="#059669" />,
      iconBg: '#d1fae5',
      titleColor: '#065f46',
      textColor: '#047857',
      progressBarBg: '#10b981',
      defaultTitle: 'Success!',
    },
    error: {
      bg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.98), rgba(254, 226, 226, 0.95))',
      border: '1px solid #f87171',
      borderGlow: '0 10px 25px -5px rgba(239, 68, 68, 0.35), 0 8px 10px -6px rgba(239, 68, 68, 0.2)',
      icon: <AlertCircle size={24} color="#dc2626" />,
      iconBg: '#fee2e2',
      titleColor: '#991b1b',
      textColor: '#b91c1c',
      progressBarBg: '#ef4444',
      defaultTitle: 'Action Failed',
    },
    warning: {
      bg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.95))',
      border: '1px solid #fbbf24',
      borderGlow: '0 10px 25px -5px rgba(245, 158, 11, 0.35), 0 8px 10px -6px rgba(245, 158, 11, 0.2)',
      icon: <AlertTriangle size={24} color="#d97706" />,
      iconBg: '#fef3c7',
      titleColor: '#92400e',
      textColor: '#b45309',
      progressBarBg: '#f59e0b',
      defaultTitle: 'Attention',
    },
    info: {
      bg: 'linear-gradient(135deg, rgba(240, 249, 255, 0.98), rgba(224, 242, 254, 0.95))',
      border: '1px solid #38bdf8',
      borderGlow: '0 10px 25px -5px rgba(2, 132, 199, 0.35), 0 8px 10px -6px rgba(2, 132, 199, 0.2)',
      icon: <Info size={24} color="#0284c7" />,
      iconBg: '#e0f2fe',
      titleColor: '#075985',
      textColor: '#0369a1',
      progressBarBg: '#0284c7',
      defaultTitle: 'Notice',
    },
  }[toast.type] || config.info;

  return (
    <div
      style={{
        pointerEvents: 'auto',
        width: '100%',
        background: config.bg,
        border: config.border,
        boxShadow: `${config.borderGlow}, 0 20px 25px -5px rgba(0, 0, 0, 0.1)`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '14px',
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        animation: isExiting
          ? 'toastSlideOut 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards'
          : 'toastSlideIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: config.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
        }}
      >
        {config.icon}
      </div>

      {/* Message content */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: config.titleColor,
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {toast.title || config.defaultTitle}
        </div>
        <div
          style={{
            fontSize: '12.5px',
            color: config.textColor,
            lineHeight: 1.45,
            wordBreak: 'break-word',
            fontWeight: '500',
          }}
        >
          {toast.message}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          background: 'none',
          border: 'none',
          color: config.titleColor,
          opacity: 0.65,
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.65';
          e.currentTarget.style.background = 'none';
        }}
      >
        <X size={16} />
      </button>

      {/* Countdown progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3.5px',
          background: config.progressBarBg,
          width: '100%',
          animation: `toastCountdown ${toast.duration}ms linear forwards`,
          opacity: 0.8,
        }}
      />
    </div>
  );
}
