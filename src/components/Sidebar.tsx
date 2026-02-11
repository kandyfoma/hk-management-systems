import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Divider, Avatar, Title, Paragraph } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { theme } from '../theme/theme';

interface SidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export function Sidebar({ activeRoute, onNavigate }: SidebarProps) {
  const { user } = useSelector((state: RootState) => state.auth);

  const menuItems = [
    { key: 'dashboard', title: 'Tableau de Bord', icon: 'view-dashboard' },
    { key: 'purchase', title: 'Achats', icon: 'shopping' },
    { key: 'dispenser', title: 'Dispensaire', icon: 'medical-bag' },
    { key: 'product', title: 'Produits', icon: 'package-variant' },
    { key: 'reports', title: 'Rapports', icon: 'chart-line' },
    { key: 'stock', title: 'Stock', icon: 'warehouse' },
    { key: 'customer', title: 'Clients', icon: 'account-group' },
    { key: 'manufacturer', title: 'Fabricants', icon: 'factory' },
    { key: 'employee', title: 'Employés', icon: 'account-tie' },
    { key: 'settings', title: 'Paramètres', icon: 'cog' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <Avatar.Text 
            size={48} 
            label={user?.firstName?.[0] + user?.lastName?.[0] || 'U'} 
            style={styles.avatar}
          />
          <Title style={styles.userName}>{user?.firstName} {user?.lastName}</Title>
          <Paragraph style={styles.userRole}>{user?.role.toUpperCase()}</Paragraph>
        </View>

        <Divider style={styles.divider} />

        {/* Navigation Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <List.Item
              key={item.key}
              title={item.title}
              left={() => <List.Icon icon={item.icon} />}
              style={[
                styles.menuItem,
                activeRoute === item.key && styles.activeMenuItem
              ]}
              titleStyle={[
                styles.menuItemTitle,
                activeRoute === item.key && styles.activeMenuItemTitle
              ]}
              onPress={() => onNavigate(item.key)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.outline,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 14,
    color: theme.colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 8,
  },
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activeMenuItem: {
    backgroundColor: theme.colors.primary + '20',
    borderRightWidth: 3,
    borderRightColor: theme.colors.primary,
  },
  menuItemTitle: {
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  activeMenuItemTitle: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});