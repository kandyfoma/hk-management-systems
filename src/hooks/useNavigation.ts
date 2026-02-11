/**
 * Custom navigation hook for better back navigation support
 */
import { useCallback, useState } from 'react';

interface NavigationState {
  currentScreen: string;
  history: string[];
}

export const useAppNavigation = (initialScreen: string = 'dashboard') => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: initialScreen,
    history: [initialScreen]
  });

  const navigateTo = useCallback((screen: string) => {
    setNavigationState(prev => ({
      currentScreen: screen,
      history: [...prev.history, screen]
    }));
    
    // Update URL for web
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.set('screen', screen);
      window.history.pushState(null, '', url.toString());
    }
  }, []);

  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.history.length <= 1) return prev;
      
      const newHistory = [...prev.history];
      newHistory.pop(); // Remove current screen
      const previousScreen = newHistory[newHistory.length - 1];
      
      // Update URL for web
      if (typeof window !== 'undefined' && window.history) {
        const url = new URL(window.location.href);
        url.searchParams.set('screen', previousScreen);
        window.history.replaceState(null, '', url.toString());
      }
      
      return {
        currentScreen: previousScreen,
        history: newHistory
      };
    });
  }, []);

  const canGoBack = navigationState.history.length > 1;

  // Handle browser back button
  const handlePopState = useCallback(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const screen = params.get('screen') || 'dashboard';
      
      setNavigationState(prev => {
        const historyIndex = prev.history.lastIndexOf(screen);
        if (historyIndex !== -1) {
          return {
            currentScreen: screen,
            history: prev.history.slice(0, historyIndex + 1)
          };
        }
        return prev;
      });
    }
  }, []);

  return {
    currentScreen: navigationState.currentScreen,
    navigateTo,
    goBack,
    canGoBack,
    history: navigationState.history,
    handlePopState
  };
};