import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Portal, Modal } from 'react-native-paper';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { theme } from '../theme/theme';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;
const isTablet = width >= 768;

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}

export function DashboardLayout({ 
  children, 
  currentRoute = 'dashboard', 
  onNavigate = () => {} 
}: DashboardLayoutProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  const handleNavigate = (route: string) => {
    onNavigate(route);
    if (!isTablet) {
      setSidebarVisible(false);
    }
  };

  const SidebarComponent = (
    <Sidebar 
      activeRoute={currentRoute} 
      onNavigate={handleNavigate}
    />
  );

  return (
    <View style={styles.container}>
      <Header 
        onMenuPress={toggleSidebar}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <View style={styles.body}>
        {/* Desktop Sidebar */}
        {isTablet && (
          <View style={styles.desktopSidebar}>
            {SidebarComponent}
          </View>
        )}

        {/* Main Content */}
        <View style={[styles.content, isTablet && styles.contentWithSidebar]}>
          {children}
        </View>

        {/* Mobile Sidebar Modal */}
        {!isTablet && (
          <Portal>
            <Modal
              visible={sidebarVisible}
              onDismiss={() => setSidebarVisible(false)}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.mobileSidebar}>
                {SidebarComponent}
              </View>
            </Modal>
          </Portal>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentWithSidebar: {
    marginLeft: 0, // Already handled by flexDirection
  },
  modalContent: {
    backgroundColor: 'transparent',
    margin: 0,
    justifyContent: 'flex-start',
  },
  mobileSidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
});