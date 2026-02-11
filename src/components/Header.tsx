import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Searchbar, IconButton, Avatar, Menu, Divider } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { AuthService } from '../services/AuthService';
import { theme } from '../theme/theme';

interface HeaderProps {
  onMenuPress?: () => void;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
}

export function Header({ onMenuPress, searchValue = '', onSearchChange }: HeaderProps) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = async () => {
    setMenuVisible(false);
    await AuthService.logout();
    dispatch(logout());
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <View style={styles.container}>
      {/* Left Section */}
      <View style={styles.leftSection}>
        <IconButton
          icon="menu"
          size={24}
          onPress={onMenuPress}
          iconColor={theme.colors.onSurface}
        />
        
        <Searchbar
          placeholder="Rechercher..."
          onChangeText={onSearchChange}
          value={searchValue}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* Right Section */}
      <View style={styles.rightSection}>
        <IconButton
          icon="bell"
          size={24}
          iconColor={theme.colors.onSurface}
          onPress={() => {}}
        />

        <Menu
          visible={menuVisible}
          onDismiss={closeMenu}
          anchor={
            <IconButton
              icon="account-circle"
              size={32}
              iconColor={theme.colors.primary}
              onPress={openMenu}
            />
          }
          contentStyle={styles.menuContent}
        >
          <Menu.Item
            title={`${user?.firstName} ${user?.lastName}`}
            titleStyle={styles.userMenuItem}
            disabled
          />
          <Menu.Item
            title={user?.role.toUpperCase()}
            titleStyle={styles.roleMenuItem}
            disabled
          />
          <Divider />
          <Menu.Item
            title="Profil"
            leadingIcon="account"
            onPress={() => {
              closeMenu();
              // Navigate to profile
            }}
          />
          <Menu.Item
            title="Paramètres"
            leadingIcon="cog"
            onPress={() => {
              closeMenu();
              // Navigate to settings
            }}
          />
          <Divider />
          <Menu.Item
            title="Déconnexion"
            leadingIcon="logout"
            onPress={handleLogout}
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    flex: 1,
    marginLeft: 16,
    height: 40,
    elevation: 0,
    backgroundColor: theme.colors.background,
  },
  searchInput: {
    fontSize: 14,
  },
  menuContent: {
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  userMenuItem: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  roleMenuItem: {
    fontSize: 12,
    opacity: 0.7,
  },
});