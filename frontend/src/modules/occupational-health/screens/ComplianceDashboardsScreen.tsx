import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// ─── ISO 45001 Compliance Dashboard ─────────────────────────────
export function ISO45001DashboardScreen() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const sections = [
    {
      id: 'context',
      name: 'Context of the Organization',
      percentage: 100,
      requirements: [
        { id: 'context-1', title: 'Determine scope', status: 'compliant' },
        { id: 'context-2', title: 'Identify external issues', status: 'compliant' },
        { id: 'context-3', title: 'Identify internal issues', status: 'compliant' },
      ],
    },
    {
      id: 'leadership',
      name: 'Leadership & Commitment',
      percentage: 95,
      requirements: [
        { id: 'lead-1', title: 'Top management commitment', status: 'compliant' },
        { id: 'lead-2', title: 'Policy developed', status: 'compliant' },
        { id: 'lead-3', title: 'Roles & responsibilities', status: 'minor-gap' },
      ],
    },
    {
      id: 'planning',
      name: 'Planning',
      percentage: 90,
      requirements: [
        { id: 'plan-1', title: 'Hazard identification', status: 'compliant' },
        { id: 'plan-2', title: 'Risk assessment', status: 'compliant' },
        { id: 'plan-3', title: 'Compliance obligations', status: 'minor-gap' },
        { id: 'plan-4', title: 'Objectives & planning', status: 'compliant' },
      ],
    },
    {
      id: 'support',
      name: 'Support (Resources)',
      percentage: 88,
      requirements: [
        { id: 'support-1', title: 'Resources allocated', status: 'compliant' },
        { id: 'support-2', title: 'Competence & training', status: 'major-gap' },
        { id: 'support-3', title: 'Awareness program', status: 'compliant' },
      ],
    },
    {
      id: 'operation',
      name: 'Operational Planning & Control',
      percentage: 85,
      requirements: [
        { id: 'op-1', title: 'Operational controls', status: 'compliant' },
        { id: 'op-2', title: 'Emergency preparedness', status: 'minor-gap' },
        { id: 'op-3', title: 'Change management', status: 'major-gap' },
      ],
    },
    {
      id: 'performance',
      name: 'Performance Evaluation',
      percentage: 92,
      requirements: [
        { id: 'perf-1', title: 'Monitoring & measurement', status: 'compliant' },
        { id: 'perf-2', title: 'Incident investigation', status: 'compliant' },
        { id: 'perf-3', title: 'Internal audit', status: 'minor-gap' },
      ],
    },
    {
      id: 'improvement',
      name: 'Improvement',
      percentage: 87,
      requirements: [
        { id: 'imp-1', title: 'Corrective action', status: 'compliant' },
        { id: 'imp-2', title: 'Continuous improvement', status: 'minor-gap' },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'compliant') return '#22C55E';
    if (status === 'minor-gap') return '#F59E0B';
    return '#EF4444';
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 95) return '#22C55E';
    if (pct >= 85) return '#F59E0B';
    return '#EF4444';
  };

  const overallCompliance = Math.round(sections.reduce((acc, s) => acc + s.percentage, 0) / sections.length);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>ISO 45001:2023</Text>
          <Text style={styles.subtitle}>Occupational Health & Safety Management</Text>
        </View>

        {/* Overall Compliance */}
        <View style={[styles.section, styles.cardShadow, { marginHorizontal: spacing.md, marginBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: getPercentageColor(overallCompliance) }}>
                {overallCompliance}%
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Compliance</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Overall Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {sections.length} clauses monitored
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ backgroundColor: '#22C55E' + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#22C55E' }}>6 Compliant</Text>
                </View>
                <View style={{ backgroundColor: '#F59E0B' + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#F59E0B' }}>1 Gap</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {sections.map(section => (
            <View key={section.id}>
              <TouchableOpacity
                style={[styles.sectionCard, styles.cardShadow]}
                onPress={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionName}>{section.name}</Text>
                    <View style={{ height: 6, backgroundColor: colors.outlineVariant, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' }}>
                      <View
                        style={{
                          height: '100%',
                          width: `${section.percentage}%`,
                          backgroundColor: getPercentageColor(section.percentage),
                        }}
                      />
                    </View>
                  </View>
                  <View style={{ marginLeft: spacing.md, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: getPercentageColor(section.percentage) }}>
                      {section.percentage}%
                    </Text>
                    <Ionicons name={selectedSection === section.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Requirements */}
              {selectedSection === section.id && (
                <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.background, marginBottom: spacing.md, borderRadius: borderRadius.lg }}>
                  {section.requirements.map(req => (
                    <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: getStatusColor(req.status) + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons
                          name={req.status === 'compliant' ? 'checkmark' : req.status === 'minor-gap' ? 'alert' : 'close'}
                          size={14}
                          color={getStatusColor(req.status)}
                        />
                      </View>
                      <Text style={{ flex: 1, fontSize: 12, color: colors.text }}>{req.title}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: getStatusColor(req.status) }}>
                        {req.status === 'compliant' ? 'OK' : req.status === 'minor-gap' ? 'Gap' : 'Major'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── ISO 27001 Data Security Dashboard ───────────────────────────
export function ISO27001DashboardScreen() {
  const [selectedControl, setSelectedControl] = useState<string | null>(null);

  const controls = [
    {
      id: 'access',
      name: 'Access Control',
      percentage: 100,
      items: [
        { id: 'access-1', title: 'User access management', implemented: true },
        { id: 'access-2', title: 'Role-based access', implemented: true },
        { id: 'access-3', title: 'Privilege management', implemented: true },
      ],
    },
    {
      id: 'encryption',
      name: 'Encryption & Cryptography',
      percentage: 95,
      items: [
        { id: 'enc-1', title: 'Data at rest encryption (AES-256)', implemented: true },
        { id: 'enc-2', title: 'Data in transit (TLS 1.3)', implemented: true },
        { id: 'enc-3', title: 'Key management system', implemented: true },
      ],
    },
    {
      id: 'audit',
      name: 'Audit Logging',
      percentage: 100,
      items: [
        { id: 'audit-1', title: 'User activity logging', implemented: true },
        { id: 'audit-2', title: 'Access attempt logging', implemented: true },
        { id: 'audit-3', title: 'Data modification tracking', implemented: true },
      ],
    },
    {
      id: 'monitoring',
      name: 'Security Monitoring',
      percentage: 90,
      items: [
        { id: 'mon-1', title: 'Real-time threat detection', implemented: true },
        { id: 'mon-2', title: 'Intrusion prevention', implemented: true },
        { id: 'mon-3', title: 'Vulnerability scanning', implemented: true },
      ],
    },
    {
      id: 'backup',
      name: 'Backup & Recovery',
      percentage: 100,
      items: [
        { id: 'bak-1', title: 'Daily encrypted backups', implemented: true },
        { id: 'bak-2', title: 'Disaster recovery plan', implemented: true },
        { id: 'bak-3', title: 'Recovery time objective (RTO)', implemented: true },
      ],
    },
  ];

  const overallSecurity = Math.round(controls.reduce((acc, c) => acc + c.percentage, 0) / controls.length);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>ISO 27001:2022</Text>
          <Text style={styles.subtitle}>Information Security Management</Text>
        </View>

        {/* Overall Security */}
        <View style={[styles.section, styles.cardShadow, { marginHorizontal: spacing.md, marginBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#22C55E' }}>
                {overallSecurity}%
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Implemented</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Overall Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {controls.length} control areas active
              </Text>
              <View style={{ backgroundColor: '#22C55E' + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginTop: spacing.md, alignSelf: 'flex-start' }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#22C55E' }}>✓ Fully Compliant</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {controls.map(control => (
            <TouchableOpacity
              key={control.id}
              style={[styles.controlCard, styles.cardShadow]}
              onPress={() => setSelectedControl(selectedControl === control.id ? null : control.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.controlName}>{control.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
                    <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{control.percentage}% Implemented</Text>
                  </View>
                </View>
                <Ionicons name={selectedControl === control.id ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </View>

              {selectedControl === control.id && (
                <View style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline }}>
                  {control.items.map(item => (
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
                      <Ionicons name={item.implemented ? 'checkmark-circle' : 'close-circle'} size={18} color={item.implemented ? '#22C55E' : '#EF4444'} />
                      <Text style={{ flex: 1, fontSize: 12, color: colors.text }}>{item.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}

          {/* Data Retention Policy */}
          <View style={[styles.section, styles.cardShadow]}>
            <Text style={styles.sectionTitle}>Data Retention Policy</Text>
            <View style={{ gap: spacing.md }}>
              <DataRetentionItem label="Medical Records" retention="7 years after termination" status="active" />
              <DataRetentionItem label="Incident Reports" retention="10 years" status="active" />
              <DataRetentionItem label="Audit Logs" retention="3 years" status="active" />
              <DataRetentionItem label="Personal Data" retention="Until consent withdrawal" status="active" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function DataRetentionItem({ label, retention, status }: { label: string; retention: string; status: string }) {
  return (
    <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{label}</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{retention}</Text>
        </View>
        <View style={{ backgroundColor: '#22C55E' + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#22C55E' }}>✓ Active</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  section: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },

  sectionCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionName: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  controlCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  controlName: { fontSize: 13, fontWeight: '700', color: colors.text },

  cardShadow: shadows.sm,
});
