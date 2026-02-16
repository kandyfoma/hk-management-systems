import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { List, Divider, Avatar, Title, Paragraph, Badge } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { theme } from '../theme/theme';

interface SidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
}

export function Sidebar({ activeRoute, onNavigate }: SidebarProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { patients, appointments } = useSelector((state: RootState) => state.hospital);
  const { drugs, inventory } = useSelector((state: RootState) => state.pharmacy);
  const { workers, incidents, examinations } = useSelector((state: RootState) => state.occupationalHealth);

  // Calculate counts for various modules
  const counts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return {
      // Patients - total active patients
      patients: patients.filter(p => p.status === 'active').length,
      
      // Appointments - today's appointments
      todayAppointments: appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= todayStart && aptDate < todayEnd;
      }).length,
      
      // Pending appointments
      pendingAppointments: appointments.filter(apt => apt.status === 'scheduled' || apt.status === 'confirmed').length,
      
      // Dispensary - low stock items
      lowStockItems: inventory.filter(item => 
        item.quantityInStock <= item.reorderLevel && item.status === 'active'
      ).length,
      
      // Expired drugs
      expiredItems: inventory.filter(item => {
        if (!item.expiryDate || item.status === 'expired') return item.status === 'expired';
        return new Date(item.expiryDate) < now;
      }).length,
      
      // Total drugs
      totalDrugs: drugs.length,
      
      // Total inventory items
      totalInventory: inventory.length,
      
      // Active workers
      activeWorkers: workers.filter(w => w.status === 'active').length,
      
      // Overdue medical exams
      overdueMedicalExams: workers.filter(w => {
        if (!w.nextMedicalExam) return false;
        return new Date(w.nextMedicalExam) < now;
      }).length,
      
      // Recent incidents (last 30 days)
      recentIncidents: incidents.filter(incident => {
        const incidentDate = new Date(incident.dateOccurred);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return incidentDate >= thirtyDaysAgo;
      }).length,
      
      // Pending examinations
      pendingExaminations: examinations.filter(exam => exam.status === 'scheduled').length,
    };
  }, [patients, appointments, drugs, inventory, workers, incidents, examinations]);

  const menuItems = [
    { 
      key: 'dashboard', 
      title: 'Tableau de Bord', 
      icon: 'view-dashboard',
      count: null
    },
    { 
      key: 'purchase', 
      title: 'Achats', 
      icon: 'shopping',
      count: null
    },
    { 
      key: 'dispenser', 
      title: 'Dispensaire', 
      icon: 'medical-bag',
      count: counts.lowStockItems > 0 ? counts.lowStockItems : null,
      countColor: counts.lowStockItems > 0 ? '#ff6b6b' : undefined,
      description: counts.lowStockItems > 0 ? 'Stock faible' : undefined
    },
    { 
      key: 'product', 
      title: 'Produits', 
      icon: 'package-variant',
      count: counts.totalDrugs,
      description: counts.expiredItems > 0 ? `${counts.expiredItems} expirés` : undefined,
      countColor: counts.expiredItems > 0 ? '#ff6b6b' : undefined
    },
    { 
      key: 'reports', 
      title: 'Rapports', 
      icon: 'chart-line',
      count: null
    },
    { 
      key: 'stock', 
      title: 'Stock', 
      icon: 'warehouse',
      count: counts.totalInventory,
      description: counts.expiredItems > 0 ? `${counts.expiredItems} expirés` : undefined
    },
    { 
      key: 'customer', 
      title: 'Patients', 
      icon: 'account-group',
      count: counts.patients,
      description: counts.todayAppointments > 0 ? `${counts.todayAppointments} RDV aujourd'hui` : undefined
    },
    { 
      key: 'manufacturer', 
      title: 'Fabricants', 
      icon: 'factory',
      count: null
    },
    { 
      key: 'employee', 
      title: 'Employés', 
      icon: 'account-tie',
      count: counts.activeWorkers,
      description: counts.overdueMedicalExams > 0 ? `${counts.overdueMedicalExams} exams en retard` : undefined,
      countColor: counts.overdueMedicalExams > 0 ? '#ff9f43' : undefined
    },
    { 
      key: 'occupational-health', 
      title: 'Santé au Travail', 
      icon: 'shield-heart',
      count: counts.recentIncidents > 0 ? counts.recentIncidents : null,
      description: counts.pendingExaminations > 0 ? `${counts.pendingExaminations} exams prévus` : undefined,
      countColor: counts.recentIncidents > 0 ? '#ff6b6b' : undefined
    },
    { 
      key: 'settings', 
      title: 'Paramètres', 
      icon: 'cog',
      count: null
    },
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
            <View key={item.key}>
              <List.Item
                title={item.title}
                left={() => <List.Icon icon={item.icon} />}
                right={() => (
                  <View style={styles.rightContent}>
                    {item.count !== null && item.count !== undefined && (
                      <Badge 
                        size={18} 
                        style={[
                          styles.badge,
                          { backgroundColor: item.countColor || theme.colors.primary }
                        ]}
                      >
                        {item.count}
                      </Badge>
                    )}
                  </View>
                )}
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
              {item.description && (
                <Text style={[
                  styles.menuItemDescription,
                  { color: item.countColor || theme.colors.onSurface }
                ]}>
                  {item.description}
                </Text>
              )}
            </View>
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
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
  },
  menuItemDescription: {
    fontSize: 12,
    marginLeft: 56,
    marginRight: 16,
    marginBottom: 8,
    opacity: 0.8,
  },
});