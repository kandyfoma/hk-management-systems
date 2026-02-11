import React from 'react';
import { ToastProvider } from './Toast';
import { ModalProvider } from './Modal';
import { ConnectivityProvider } from '../context/ConnectivityContext';
import { ConnectivityBanner } from './ConnectivityBanner';

/**
 * GlobalUIProvider — wraps the app with Connectivity + Toast + Modal providers
 * and renders the persistent ConnectivityBanner overlay.
 */
export function GlobalUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConnectivityProvider>
      <ModalProvider>
        <ToastProvider>
          {children}
          <ConnectivityBanner />
        </ToastProvider>
      </ModalProvider>
    </ConnectivityProvider>
  );
}

// Re-export hooks for convenience
export { useToast } from './Toast';
export { useModal } from './Modal';
export { useConnectivity } from '../context/ConnectivityContext';
