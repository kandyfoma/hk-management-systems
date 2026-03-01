import { useState } from 'react';

export interface SimpleToastMessage {
  text: string;
  type: 'success' | 'error';
}

/**
 * Custom hook for simple toast notifications
 * Provides the same toast experience as CertificatesScreen
 * 
 * Returns: { toastMsg, showToast }
 * - toastMsg: Current toast message object or null
 * - showToast(text, type): Function to show a toast
 *   - text: Message to display
 *   - type: 'success' | 'error' (defaults to 'success')
 */
export function useSimpleToast() {
  const [toastMsg, setToastMsg] = useState<SimpleToastMessage | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  return { toastMsg, showToast };
}
