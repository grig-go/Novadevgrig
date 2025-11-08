import { useState, useEffect } from 'react';

interface Toast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (newToast: Toast) => {
    // For now, just console log - you can replace with actual toast implementation
    console.log(`[TOAST] ${newToast.variant || 'default'}: ${newToast.title} - ${newToast.description}`);

    // If you want to show alerts temporarily (replace with proper toast UI later)
    if (newToast.variant === 'destructive') {
      console.error(`Error: ${newToast.title} - ${newToast.description}`);
    }
  };

  return { toast };
}