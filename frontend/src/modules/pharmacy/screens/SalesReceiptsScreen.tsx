import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { SaleUtils } from '../../../models/Sale';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';

type SaleListRow = {
  id: string;
  sale_number: string;
  receipt_number: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount: string | number;
  item_count: number;
  status: string;
  created_at: string;
};

type SaleDetail = {
  id: string;
  organization_name?: string;
  sale_number: string;
  receipt_number: string;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  currency?: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: string | number;
    line_total: string | number;
  }>;
  payments: Array<{
    id: string;
    payment_method: string;
    amount: string | number;
  }>;
};

const toNum = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (amount: unknown, currency = 'CDF') => SaleUtils.formatCurrency(toNum(amount), currency);

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildReceiptHtml = (sale: SaleDetail): string => {
  const currency = sale.currency || 'CDF';
  const rowsHtml = sale.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${escapeHtml(formatCurrency(item.unit_price, currency))}</td>
        <td class="right">${escapeHtml(formatCurrency(item.line_total, currency))}</td>
      </tr>
    `).join('');

  const paymentsHtml = sale.payments.length > 0
    ? sale.payments.map((payment) => `
        <div class="payment-row">
          <span>${escapeHtml(SaleUtils.getPaymentMethodLabel((payment.payment_method as any) || 'CASH'))}</span>
          <strong>${escapeHtml(formatCurrency(payment.amount, currency))}</strong>
        </div>
      `).join('')
    : '<div class="payment-row"><span>Non renseigné</span><strong>—</strong></div>';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reçu ${escapeHtml(sale.receipt_number)}</title>
  <style>
    :root {
      --primary: #122056;
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --surface: #ffffff;
      --ok: #0f766e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      background: var(--bg);
      color: #0f172a;
      padding: 24px;
    }
    .sheet {
      max-width: 860px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 22px 24px;
      background: linear-gradient(135deg, #122056 0%, #1e3a8a 100%);
      color: #fff;
    }
    .brand h1 {
      margin: 0;
      font-size: 22px;
      letter-spacing: 0.2px;
    }
    .brand p {
      margin: 6px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }
    .badge {
      border: 1px solid rgba(255,255,255,.35);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      align-self: flex-start;
      background: rgba(255,255,255,.14);
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap: 12px;
      padding: 18px 24px;
      border-bottom: 1px solid var(--border);
    }
    .meta .card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
    }
    .label { font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; letter-spacing: .5px; }
    .value { margin-top: 4px; font-size: 13px; font-weight: 700; color: #0f172a; }
    .content { padding: 18px 24px 24px; }
    .section-title { margin: 0 0 10px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
    .client {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
      background: #fff;
    }
    .client-row { display: flex; gap: 8px; margin: 4px 0; font-size: 13px; }
    .client-row span:first-child { color: var(--muted); min-width: 84px; }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      font-size: 13px;
    }
    thead th {
      background: #eef2ff;
      color: #1e3a8a;
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .4px;
    }
    tbody td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .center { text-align: center; }
    .totals {
      margin-top: 16px;
      margin-left: auto;
      max-width: 320px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      background: #fcfdff;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin: 6px 0;
    }
    .grand {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed var(--border);
      font-size: 16px;
      font-weight: 800;
      color: var(--primary);
    }
    .payments {
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      background: #fff;
    }
    .payment-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      margin: 6px 0;
    }
    .footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .sheet { border: none; border-radius: 0; }
    }
    @media (max-width: 760px) {
      .meta { grid-template-columns: repeat(2, minmax(0,1fr)); }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>HK Management Systems</h1>
        <p>${escapeHtml(sale.organization_name || 'Pharmacie')}</p>
      </div>
      <div class="badge">PAIEMENT VALIDÉ</div>
    </div>

    <div class="meta">
      <div class="card">
        <div class="label">Reçu N°</div>
        <div class="value">${escapeHtml(sale.receipt_number)}</div>
      </div>
      <div class="card">
        <div class="label">Vente N°</div>
        <div class="value">${escapeHtml(sale.sale_number)}</div>
      </div>
      <div class="card">
        <div class="label">Date</div>
        <div class="value">${escapeHtml(SaleUtils.formatDateTime(sale.created_at))}</div>
      </div>
      <div class="card">
        <div class="label">Caissier</div>
        <div class="value">${escapeHtml(sale.cashier_name || '-')}</div>
      </div>
      <div class="card">
        <div class="label">Organisation</div>
        <div class="value">${escapeHtml(sale.organization_name || 'Pharmacie')}</div>
      </div>
    </div>

    <div class="content">
      <h3 class="section-title">Informations Client</h3>
      <div class="client">
        <div class="client-row"><span>Nom:</span><strong>${escapeHtml(sale.customer_name || 'Client anonyme')}</strong></div>
        <div class="client-row"><span>Téléphone:</span><strong>${escapeHtml(sale.customer_phone || '-')}</strong></div>
        <div class="client-row"><span>Email:</span><strong>${escapeHtml(sale.customer_email || '-')}</strong></div>
      </div>

      <h3 class="section-title">Articles</h3>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th class="center">Qté</th>
            <th class="right">Prix Unitaire</th>
            <th class="right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row"><span>Sous-total</span><strong>${escapeHtml(formatCurrency(sale.subtotal, currency))}</strong></div>
        <div class="total-row"><span>Remise</span><strong>${escapeHtml(formatCurrency(sale.discount_amount, currency))}</strong></div>
        <div class="total-row"><span>Taxe</span><strong>${escapeHtml(formatCurrency(sale.tax_amount, currency))}</strong></div>
        <div class="total-row grand"><span>TOTAL</span><strong>${escapeHtml(formatCurrency(sale.total_amount, currency))}</strong></div>
      </div>

      <div class="payments">
        <h3 class="section-title" style="margin-top:0;">Paiements</h3>
        ${paymentsHtml}
      </div>

      <div class="footer">
        Merci pour votre confiance.<br />
        Document généré automatiquement par HK Management Systems.
      </div>
    </div>
  </div>
</body>
</html>`;
};

export function SalesReceiptsScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<SaleListRow[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadSales = useCallback(async () => {
    try {
      const api = ApiService.getInstance();
      const res = await api.get('/sales/', { page_size: 100, ordering: '-created_at' });
      if (!res.success) throw new Error(res.error?.message || 'Erreur API');
      const payload = res.data as any;
      const list: SaleListRow[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
      setRows(list);
    } catch {
      toast.error('Erreur lors du chargement des ventes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const openReceipt = useCallback(async (saleId: string) => {
    try {
      setDetailsLoading(true);
      const api = ApiService.getInstance();
      const res = await api.get(`/sales/${saleId}/`);
      if (!res.success) throw new Error(res.error?.message || 'Erreur API');
      setSelectedSale(res.data as SaleDetail);
    } catch {
      toast.error('Impossible de charger le reçu');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const downloadReceipt = useCallback(async (saleId: string) => {
    try {
      const api = ApiService.getInstance();
      const res = await api.get(`/sales/${saleId}/`);
      if (!res.success) throw new Error(res.error?.message || 'Erreur API');

      const detail = res.data as SaleDetail;
      const fileName = `${detail.receipt_number || detail.sale_number || 'receipt'}.html`;
      const content = buildReceiptHtml(detail);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        toast.success('Reçu téléchargé');
        return;
      }

      toast.info('Téléchargement disponible sur version web');
    } catch {
      toast.error('Impossible de télécharger le reçu');
    }
  }, []);

  const completedCount = useMemo(() => rows.filter((r) => r.status === 'COMPLETED').length, [rows]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des ventes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSales(); }} colors={[colors.primary]} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ventes & Reçus</Text>
          <Text style={styles.subtitle}>{rows.length} vente(s), {completedCount} terminée(s)</Text>
        </View>

        <View style={styles.listCard}>
          {rows.length === 0 ? (
            <Text style={styles.emptyText}>Aucune vente trouvée.</Text>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.saleNumber}>{row.sale_number}</Text>
                  <Text style={styles.saleMeta}>{SaleUtils.formatDateTime(row.created_at)} · {row.item_count} article(s)</Text>
                  {!!row.customer_name && <Text style={styles.saleCustomer}>{row.customer_name}</Text>}
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.saleAmount}>{formatCurrency(row.total_amount)}</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openReceipt(row.id)} activeOpacity={0.7}>
                      <Ionicons name="eye-outline" size={14} color={colors.primary} />
                      <Text style={styles.actionText}>Voir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => downloadReceipt(row.id)} activeOpacity={0.7}>
                      <Ionicons name="download-outline" size={14} color={colors.primary} />
                      <Text style={styles.actionText}>Télécharger</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedSale} animationType="slide" transparent onRequestClose={() => setSelectedSale(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailsLoading || !selectedSale ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Reçu {selectedSale.receipt_number}</Text>
                  <TouchableOpacity onPress={() => setSelectedSale(null)}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.modalBody}>
                  <Text style={styles.metaLine}>{SaleUtils.formatDateTime(selectedSale.created_at)}</Text>
                  {!!selectedSale.organization_name && <Text style={styles.metaLine}>Organisation: {selectedSale.organization_name}</Text>}
                  {!!selectedSale.customer_name && <Text style={styles.metaLine}>Client: {selectedSale.customer_name}</Text>}
                  {!!selectedSale.customer_phone && <Text style={styles.metaLine}>Téléphone: {selectedSale.customer_phone}</Text>}
                  {!!selectedSale.customer_email && <Text style={styles.metaLine}>Email: {selectedSale.customer_email}</Text>}
                  <View style={styles.divider} />
                  {selectedSale.items.map((item) => (
                    <View key={item.id} style={styles.receiptItem}>
                      <Text style={styles.receiptItemName}>{item.product_name}</Text>
                      <Text style={styles.receiptItemValue}>{item.quantity} × {formatCurrency(item.unit_price, selectedSale.currency || 'CDF')}</Text>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <Text style={styles.total}>TOTAL: {formatCurrency(selectedSale.total_amount, selectedSale.currency || 'CDF')}</Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary },
  header: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  listCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, ...shadows.sm },
  emptyText: { padding: spacing.lg, color: colors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline + '55' },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  saleNumber: { fontSize: 13, fontWeight: '700', color: colors.text },
  saleMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  saleCustomer: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '800', color: colors.primary },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: 8, paddingVertical: 4 },
  actionText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '92%', maxHeight: '90%', backgroundColor: colors.surface, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  modalBody: { padding: spacing.md },
  metaLine: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  divider: { height: 1, backgroundColor: colors.outline, marginVertical: spacing.sm },
  receiptItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  receiptItemName: { flex: 1, fontSize: 13, color: colors.text },
  receiptItemValue: { fontSize: 12, color: colors.textSecondary },
  total: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
