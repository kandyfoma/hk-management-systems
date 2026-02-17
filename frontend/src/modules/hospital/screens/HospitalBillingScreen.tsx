import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  HospitalInvoice,
  InvoiceItem,
  InvoiceStatus,
  ServiceCategory,
  PaymentMethod,
  HospitalInvoiceUtils,
  ServiceCatalog,
} from '../../../models/HospitalBilling';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const sampleInvoices: (HospitalInvoice & { patientName: string })[] = [
  {
    id: '1',
    invoiceNumber: 'INV260001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    encounterId: 'E001',
    admissionId: 'ADM001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    invoiceDate: today,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'partially_paid',
    items: [
      {
        id: 'ITM001',
        invoiceId: '1',
        serviceId: 'SVC001',
        serviceName: 'Chambre USI (par jour)',
        category: 'room_board',
        quantity: 3,
        unitPrice: 150000,
        totalPrice: 450000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM002',
        invoiceId: '1',
        serviceId: 'SVC002',
        serviceName: 'Consultation Cardiologie',
        category: 'consultation',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM003',
        invoiceId: '1',
        serviceCode: 'LAB-TROP',
        serviceName: 'Troponine I',
        category: 'laboratory',
        quantity: 3,
        unitPrice: 25000,
        totalPrice: 75000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM004',
        invoiceId: '1',
        serviceCode: 'MED-INJ',
        serviceName: 'Médicaments injectables',
        category: 'pharmacy',
        quantity: 1,
        unitPrice: 180000,
        totalPrice: 180000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
    ],
    subtotal: 805000,
    discountPercent: 5,
    discountAmount: 40250,
    taxAmount: 0,
    totalAmount: 764750,
    amountPaid: 400000,
    amountDue: 364750,
    currency: 'CDF',
    createdAt: new Date().toISOString(),
    createdBy: 'USR001',
  },
  {
    id: '2',
    invoiceNumber: 'INV260002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    encounterId: 'E002',
    admissionId: 'ADM002',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    invoiceDate: yesterday,
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'paid',
    items: [
      {
        id: 'ITM005',
        invoiceId: '2',
        serviceCode: 'SURG-APP',
        serviceName: 'Appendicectomie',
        category: 'surgery',
        quantity: 1,
        unitPrice: 500000,
        totalPrice: 500000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM006',
        invoiceId: '2',
        serviceCode: 'BED-GEN',
        serviceName: 'Chambre Standard (par jour)',
        category: 'room_board',
        quantity: 4,
        unitPrice: 80000,
        totalPrice: 320000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM007',
        invoiceId: '2',
        serviceCode: 'ANES-GEN',
        serviceName: 'Anesthésie Générale',
        category: 'anesthesia',
        quantity: 1,
        unitPrice: 200000,
        totalPrice: 200000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
    ],
    subtotal: 1020000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 1020000,
    amountPaid: 1020000,
    amountDue: 0,
    currency: 'CDF',
    insuranceCoverage: 70,
    insuranceClaimId: 'CLM001',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'USR001',
  },
  {
    id: '3',
    invoiceNumber: 'INV260003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    encounterId: 'E003',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    invoiceDate: today,
    dueDate: today,
    status: 'pending',
    items: [
      {
        id: 'ITM008',
        invoiceId: '3',
        serviceCode: 'CONS-URG',
        serviceName: 'Consultation Urgence',
        category: 'consultation',
        quantity: 1,
        unitPrice: 30000,
        totalPrice: 30000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
      {
        id: 'ITM009',
        invoiceId: '3',
        serviceCode: 'LAB-CBC',
        serviceName: 'Numération Formule Sanguine',
        category: 'laboratory',
        quantity: 1,
        unitPrice: 15000,
        totalPrice: 15000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
    ],
    subtotal: 45000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 45000,
    amountPaid: 0,
    amountDue: 45000,
    currency: 'CDF',
    createdAt: new Date().toISOString(),
    createdBy: 'USR001',
  },
  {
    id: '4',
    invoiceNumber: 'INV260004',
    patientId: 'P1004',
    patientName: 'Sophie Lunga',
    encounterId: 'E004',
    admissionId: 'ADM004',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    invoiceDate: yesterday,
    dueDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    status: 'overdue',
    items: [
      {
        id: 'ITM010',
        invoiceId: '4',
        serviceCode: 'BED-MAT',
        serviceName: 'Chambre Maternité (par jour)',
        category: 'room_board',
        quantity: 2,
        unitPrice: 100000,
        totalPrice: 200000,
        createdAt: new Date().toISOString(),
        createdBy: 'USR001',
      },
    ],
    subtotal: 200000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 200000,
    amountPaid: 0,
    amountDue: 200000,
    currency: 'CDF',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'USR001',
  },
];

const sampleServiceCatalog: ServiceCatalogItem[] = [
  { id: '1', serviceCode: 'CONS-GEN', serviceName: 'Consultation Générale', category: 'consultation', unitPrice: 25000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '2', serviceCode: 'CONS-SPEC', serviceName: 'Consultation Spécialiste', category: 'consultation', unitPrice: 50000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '3', serviceCode: 'BED-GEN', serviceName: 'Chambre Standard', category: 'room_board', unitPrice: 80000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '4', serviceCode: 'BED-ICU', serviceName: 'Chambre USI', category: 'room_board', unitPrice: 150000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '5', serviceCode: 'LAB-CBC', serviceName: 'NFS Complète', category: 'laboratory', unitPrice: 15000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '6', serviceCode: 'RAD-XR', serviceName: 'Radiographie', category: 'imaging', unitPrice: 35000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '7', serviceCode: 'RAD-CT', serviceName: 'Scanner', category: 'imaging', unitPrice: 250000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
  { id: '8', serviceCode: 'SURG-MIN', serviceName: 'Chirurgie Mineure', category: 'surgery', unitPrice: 300000, currency: 'CDF', isActive: true, createdAt: new Date().toISOString(), createdBy: 'SYS' },
];

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
});

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const color = HospitalInvoiceUtils.getStatusColor(status);
  const label = HospitalInvoiceUtils.getStatusLabel(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Category Badge Component ────────────────────────────────
function CategoryBadge({ category }: { category: ServiceCategory }) {
  const label = HospitalInvoiceUtils.getCategoryLabel(category);
  const colorMap: Record<ServiceCategory, string> = {
    'consultation': colors.primary,
    'nursing': '#EC4899',
    'laboratory': colors.info,
    'imaging': colors.warning,
    'pharmacy': '#10B981',
    'room_board': '#8B5CF6',
    'surgery': colors.error,
    'procedure': '#F59E0B',
    'therapy': '#06B6D4',
    'emergency': '#EF4444',
    'supplies': '#94A3B8',
    'equipment': '#64748B',
    'administration': '#6366F1',
    'other': colors.textSecondary,
  };
  return (
    <View style={[styles.categoryBadge, { backgroundColor: colorMap[category] + '15' }]}>
      <Text style={[styles.categoryText, { color: colorMap[category] }]}>{label}</Text>
    </View>
  );
}

// ─── Format Currency ─────────────────────────────────────────
function formatCurrency(amount: number, currency: string = 'CDF'): string {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Invoice Card ────────────────────────────────────────────
function InvoiceCard({ invoice }: { invoice: typeof sampleInvoices[0] }) {
  const [expanded, setExpanded] = useState(false);
  const paidPercentage = invoice.totalAmount > 0 
    ? Math.round((invoice.amountPaid / invoice.totalAmount) * 100) 
    : 0;

  return (
    <View 
      style={[
        styles.invoiceCard,
        invoice.status === 'overdue' && { borderLeftColor: colors.error, borderLeftWidth: 4 },
      ]}
    >
      {/* Header */}
      <TouchableOpacity 
        style={styles.invoiceCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceCardLeft}>
          <View style={styles.invoiceNumberRow}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <StatusBadge status={invoice.status} />
          </View>
          <View style={styles.patientRow}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.patientName}>{invoice.patientName}</Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={14} color={colors.textSecondary} />
            <Text style={styles.dateText}>
              {new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}
            </Text>
            {invoice.insuranceCoverage && (
              <View style={styles.insuranceBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                <Text style={styles.insuranceText}>{invoice.insuranceCoverage}% Assurance</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.invoiceCardRight}>
          <Text style={styles.totalAmount}>{formatCurrency(invoice.totalAmount)}</Text>
          {invoice.amountDue > 0 && (
            <Text style={styles.amountDue}>
              Dû: {formatCurrency(invoice.amountDue)}
            </Text>
          )}
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Payment Progress Bar */}
      {invoice.status !== 'draft' && (
        <View style={styles.paymentProgress}>
          <View style={[styles.paymentProgressFill, { width: `${paidPercentage}%` }]} />
          <Text style={styles.paymentProgressText}>{paidPercentage}% payé</Text>
        </View>
      )}

      {/* Expanded Content - Items */}
      {expanded && (
        <View style={styles.itemsContent}>
          <Text style={styles.itemsTitle}>Détail des services:</Text>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.invoiceItem}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.serviceName}</Text>
                <View style={styles.itemMeta}>
                  <CategoryBadge category={item.category} />
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemUnitPrice}>
                    @ {formatCurrency(item.unitPrice)}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
            </View>
          ))}

          {/* Summary */}
          <View style={styles.invoiceSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>
                  Remise ({invoice.discountPercent}%)
                </Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -{formatCurrency(invoice.discountAmount)}
                </Text>
              </View>
            )}
            {invoice.taxAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>TVA</Text>
                <Text style={styles.summaryValue}>{formatCurrency(invoice.taxAmount)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
              <Text style={styles.summaryLabelTotal}>Total</Text>
              <Text style={styles.summaryValueTotal}>{formatCurrency(invoice.totalAmount)}</Text>
            </View>
            {invoice.amountPaid > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>Payé</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  {formatCurrency(invoice.amountPaid)}
                </Text>
              </View>
            )}
            {invoice.amountDue > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.error, fontWeight: '600' }]}>
                  Reste à payer
                </Text>
                <Text style={[styles.summaryValue, { color: colors.error, fontWeight: '700' }]}>
                  {formatCurrency(invoice.amountDue)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.invoiceActions}>
        {invoice.status === 'pending' || invoice.status === 'partially_paid' || invoice.status === 'overdue' ? (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnPrimary]} 
            activeOpacity={0.7}
            onPress={() => handlePayment(invoice)}
          >
            <Ionicons name="cash" size={16} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Encaisser</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnSecondary]} 
            activeOpacity={0.7}
            onPress={() => handleViewInvoice(invoice.id)}
          >
            <Ionicons name="eye" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Voir</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnOutline]} 
          activeOpacity={0.7}
          onPress={() => handlePrintInvoice(invoice.invoiceNumber)}
        >
          <Ionicons name="print" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnOutline]} 
          activeOpacity={0.7}
          onPress={() => handleEmailInvoice(invoice.invoiceNumber, invoice.patientName)}
        >
          <Ionicons name="mail" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Service Catalog Card ────────────────────────────────────
function ServiceCard({ service, onAdd }: { service: ServiceCatalog; onAdd: (service: ServiceCatalog) => void }) {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceCardLeft}>
        <Text style={styles.serviceName}>{service.serviceName}</Text>
        <View style={styles.serviceMeta}>
          <Text style={styles.serviceCode}>{service.serviceCode}</Text>
          <CategoryBadge category={service.category} />
        </View>
      </View>
      <View style={styles.serviceCardRight}>
        <Text style={styles.servicePrice}>{formatCurrency(service.unitPrice)}</Text>
        <TouchableOpacity 
          style={styles.addServiceBtn} 
          activeOpacity={0.7}
          onPress={() => onAdd(service)}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function HospitalBillingScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'invoices' | 'catalog'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<typeof sampleInvoices[0] | null>(null);
  
  // New invoice form
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    patientId: '',
    patientName: '',
    encounterId: '',
    type: 'outpatient' as const,
    services: [] as { serviceId: string; serviceName: string; quantity: number; unitPrice: number }[],
  });
  
  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash_cdf' as PaymentMethod,
    reference: '',
    notes: '',
  });

  // Action handlers
  const handlePayment = (invoiceId: string, patientName: string, amount: number) => {
    alert(`Traitement du paiement pour ${patientName}\nMontant: ${amount.toLocaleString('fr-CD')} CDF`);
  };

  const handlePrintInvoice = (invoiceNumber: string) => {
    alert(`Impression de la facture ${invoiceNumber}`);
  };

  const handleEmailInvoice = (invoiceNumber: string, patientName: string) => {
    alert(`Envoi par email de la facture ${invoiceNumber} pour ${patientName}`);
  };

  const handleViewInvoice = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    alert(`Affichage des détails de la facture ${invoiceId}`);
  };

  const handleCreateInvoice = () => {
    setNewInvoiceForm({
      patientId: '',
      patientName: '',
      encounterId: '',
      type: 'outpatient',
      services: [],
    });
    setShowCreateModal(true);
  };

  const handleAddService = () => {
    alert('Ajout d\'un service à la facture');
  };

  const handleConfirmCreateInvoice = () => {
    setShowCreateModal(false);
    alert(`Facture créée pour ${newInvoiceForm.patientName || 'patient'} (${newInvoiceForm.type})`);
  };

  const handleConfirmPayment = () => {
    setShowPaymentModal(false);
    if (paymentInvoice) {
      alert(`Paiement validé pour ${paymentInvoice.patientName}\nMontant: ${paymentForm.amount} CDF`);
    }
  };

  const handleAddServiceToInvoice = (service: ServiceCatalog) => {
    alert(`Service "${service.serviceName}" ajouté à la facture\nPrix: ${service.unitPrice.toLocaleString('fr-CD')} CDF`);
  };

  // Filter invoices
  const filteredInvoices = sampleInvoices.filter(invoice => {
    if (filterStatus !== 'all' && invoice.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        invoice.patientName.toLowerCase().includes(query) ||
        invoice.invoiceNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const totalRevenue = sampleInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalPending = sampleInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);
  const stats = {
    total: sampleInvoices.length,
    pending: sampleInvoices.filter(i => i.status === 'pending').length,
    overdue: sampleInvoices.filter(i => i.status === 'overdue').length,
    paid: sampleInvoices.filter(i => i.status === 'paid').length,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💰 Facturation</Text>
          <Text style={styles.headerSubtitle}>Gestion des factures et paiements</Text>
        </View>
        <TouchableOpacity 
          style={styles.newInvoiceBtn} 
          activeOpacity={0.7}
          onPress={handleCreateInvoice}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newInvoiceBtnText}>Nouvelle Facture</Text>
        </TouchableOpacity>
      </View>

      {/* Revenue Cards */}
      <View style={styles.revenueRow}>
        <View style={[styles.revenueCard, { backgroundColor: colors.successLight }]}>
          <View style={styles.revenueCardHeader}>
            <Ionicons name="trending-up" size={24} color={colors.success} />
            <Text style={styles.revenueCardLabel}>Encaissé</Text>
          </View>
          <Text style={styles.revenueCardValue}>{formatCurrency(totalRevenue)}</Text>
        </View>
        <View style={[styles.revenueCard, { backgroundColor: colors.warningLight }]}>
          <View style={styles.revenueCardHeader}>
            <Ionicons name="hourglass" size={24} color={colors.warning} />
            <Text style={styles.revenueCardLabel}>En Attente</Text>
          </View>
          <Text style={styles.revenueCardValue}>{formatCurrency(totalPending)}</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
          onPress={() => setActiveTab('invoices')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="receipt" 
            size={18} 
            color={activeTab === 'invoices' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>
            Factures
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'catalog' && styles.tabActive]}
          onPress={() => setActiveTab('catalog')}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="pricetags" 
            size={18} 
            color={activeTab === 'catalog' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            Catalogue Services
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'invoices' 
              ? "Rechercher facture, patient..." 
              : "Rechercher service..."
            }
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'invoices' ? (
        <>
          {/* ══════ SECTION: Statistiques ══════ */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>En Attente</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
              <Text style={styles.statValue}>{stats.overdue}</Text>
              <Text style={styles.statLabel}>En Retard</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
              <Text style={styles.statValue}>{stats.paid}</Text>
              <Text style={styles.statLabel}>Payées</Text>
            </View>
          </View>

          {/* ══════ SECTION: Filtres ══════ */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Toutes', color: colors.primary },
              { key: 'pending', label: 'En Attente', color: colors.warning },
              { key: 'partially_paid', label: 'Partielles', color: colors.info },
              { key: 'paid', label: 'Payées', color: colors.success },
              { key: 'overdue', label: 'En Retard', color: colors.error },
            ].map((filter) => {
              const isSelected = filterStatus === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    isSelected && { backgroundColor: filter.color, borderColor: filter.color },
                  ]}
                  onPress={() => setFilterStatus(filter.key as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ══════ SECTION: Factures ══════ */}
          <SectionHeader
            title="Factures"
            subtitle={`${filteredInvoices.length} facture(s)`}
            icon="receipt"
            accentColor={colors.info}
          />

          <View style={styles.invoicesList}>
            {filteredInvoices.map((invoice) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))}

            {filteredInvoices.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>Aucune facture trouvée</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          {/* ══════ SECTION: Catalogue Services ══════ */}
          <SectionHeader
            title="Catalogue des Services"
            subtitle={`${sampleServiceCatalog.length} services`}
            icon="pricetags"
            accentColor="#8B5CF6"
          />

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {[
              { key: 'all', label: 'Tous' },
              { key: 'consultation', label: 'Consultations' },
              { key: 'room_board', label: 'Chambres' },
              { key: 'laboratory', label: 'Laboratoire' },
              { key: 'imaging', label: 'Imagerie' },
              { key: 'surgery', label: 'Chirurgie' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.filterChip}
                activeOpacity={0.7}
              >
                <Text style={styles.filterChipText}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.servicesList}>
            {sampleServiceCatalog.map((service) => (
              <ServiceCard key={service.id} service={service} onAdd={handleAddServiceToInvoice} />
            ))}
          </View>
        </>
      )}

      {/* ══════ SECTION: Actions Rapides ══════ */}
      <SectionHeader
        title="Actions Rapides"
        icon="flash"
        accentColor={colors.warning}
      />
      <View style={styles.quickActionsRow}>
        <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.successLight }]}>
            <Ionicons name="card" size={22} color={colors.success} />
          </View>
          <Text style={styles.quickActionText}>Encaisser Paiement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.infoLight }]}>
            <Ionicons name="document-text" size={22} color={colors.info} />
          </View>
          <Text style={styles.quickActionText}>Rapport Quotidien</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.7}>
          <View style={[styles.quickActionIcon, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="notifications" size={22} color={colors.warning} />
          </View>
          <Text style={styles.quickActionText}>Rappels Impayés</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  newInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  newInvoiceBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Revenue Cards
  revenueRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  revenueCard: {
    flex: 1,
    padding: 16,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  revenueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  revenueCardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  revenueCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  // Tabs
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primaryLight || '#E0E7FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },

  // Search
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Filter
  filterScroll: {
    marginBottom: 20,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Invoices List
  invoicesList: {
    gap: 14,
  },
  invoiceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  invoiceCardLeft: {
    flex: 1,
    gap: 6,
  },
  invoiceCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  insuranceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: 8,
  },
  insuranceText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  amountDue: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  paymentProgress: {
    height: 20,
    backgroundColor: colors.surfaceVariant,
    position: 'relative',
  },
  paymentProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  paymentProgressText: {
    position: 'absolute',
    right: 8,
    top: 2,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Items Content
  itemsContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  itemLeft: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQty: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemUnitPrice: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  invoiceSummary: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRowTotal: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: colors.outline,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  summaryLabelTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },

  // Invoice Actions
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: colors.success,
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.primaryLight || '#E0E7FF',
    justifyContent: 'center',
  },
  actionBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Services List
  servicesList: {
    gap: 10,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    ...shadows.sm,
  },
  serviceCardLeft: {
    flex: 1,
    gap: 4,
  },
  serviceCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceCode: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  addServiceBtn: {
    padding: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight || '#E0E7FF',
  },

  // Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});

export default HospitalBillingScreen;
