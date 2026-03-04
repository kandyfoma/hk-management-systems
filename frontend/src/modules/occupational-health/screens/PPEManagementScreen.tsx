/**
 * PPEManagementScreen.tsx
 * Industry-grade PPE Catalogue — ISO 45001 / ILO C155
 * Full CRUD + paper-trail audit log + stock adjustment
 *
 * API:  /api/v1/occupational-health/ppe-catalog/
 *   extra: /{id}/adjust_stock/  /{id}/audit_trail/  /statistics/  /audit_log/
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Modal, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const ACCENT   = colors.primary;
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000');

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface PPECatalogItem {
  id?: string | number;
  enterprise?: number;
  work_site?: number | null;
  ppe_type: string;
  category: string;
  name: string;
  description: string;
  brand: string;
  model_number: string;
  part_number: string;
  colour_size: string;
  // Certification
  certification_standard: string;
  certification_number: string;
  certification_body: string;
  certification_expiry: string | null;
  risk_protection_level: string;
  // Stock
  stock_quantity: number;
  assigned_quantity: number;
  minimum_stock_level: number;
  reorder_point: number;
  storage_location: string;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  max_lifespan_months: number | null;
  maintenance_interval_months: number | null;
  // Commercial
  unit_price: number;
  currency: string;
  supplier: string;
  supplier_contact: string;
  supplier_reference: string;
  compatible_hazard_types: string[];
  is_active: boolean;
  notes: string;
  // Computed (read-only from server)
  available_quantity?: number;
  is_low_stock?: boolean;
  needs_reorder?: boolean;
  is_expired?: boolean;
  is_certification_expired?: boolean;
  total_value?: number;
  // Metadata
  created_by?: number | null;
  created_by_name?: string | null;
  updated_by?: number | null;
  updated_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  recent_audit_logs?: PPEAuditEntry[];
  category_display?: string;
  ppe_type_display?: string;
}

interface PPEAuditEntry {
  id: number;
  action: string;
  action_display: string;
  actor_full_name: string;
  actor_name: string;
  timestamp: string;
  changes: Record<string, { old: string; new: string }>;
  notes: string;
  worker_name?: string;
}

// ──────────────────────────────────────────────────────────────
// Lookup tables
// ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'head',        label: 'Tete',         icon: 'construct',         color: '#D97706' },
  { value: 'eye',         label: 'Yeux',         icon: 'eye',               color: '#3B82F6' },
  { value: 'ear',         label: 'Oreilles',     icon: 'ear',               color: '#8B5CF6' },
  { value: 'respiratory', label: 'Resp.',        icon: 'cloud',             color: '#0891B2' },
  { value: 'hand',        label: 'Mains',        icon: 'hand-left',         color: '#EA580C' },
  { value: 'foot',        label: 'Pieds',        icon: 'footsteps',         color: '#16A34A' },
  { value: 'body',        label: 'Corps',        icon: 'body',              color: '#6366F1' },
  { value: 'fall',        label: 'Anti-chute',   icon: 'trending-down',     color: '#DC2626' },
  { value: 'high_vis',    label: 'Haute Vis.',   icon: 'sunny',             color: '#F59E0B' },
  { value: 'chemical',    label: 'Chimique',     icon: 'flask',             color: '#7C3AED' },
  { value: 'electrical',  label: 'Electrique',   icon: 'flash',             color: '#FBBF24' },
  { value: 'thermal',     label: 'Thermique',    icon: 'thermometer',       color: '#EF4444' },
  { value: 'ergonomic',   label: 'Ergonomique',  icon: 'desktop',           color: '#059669' },
  { value: 'other',       label: 'Autre',        icon: 'shield',            color: '#94A3B8' },
];

const HAZARD_TYPES = [
  { value: 'physical',     label: 'Physique'     },
  { value: 'chemical',     label: 'Chimique'     },
  { value: 'biological',   label: 'Biologique'   },
  { value: 'psychosocial', label: 'Psychosocial' },
  { value: 'ergonomic',    label: 'Ergonomique'  },
  { value: 'safety',       label: 'Securite'     },
];

const PPE_TYPES = [
  { value: 'hard_hat',       label: 'Casque'              },
  { value: 'safety_glasses', label: 'Lunettes'            },
  { value: 'face_shield',    label: 'Ecran facial'        },
  { value: 'ear_plugs',      label: 'Bouchons oreilles'   },
  { value: 'ear_muffs',      label: 'Anti-bruit'          },
  { value: 'respirator',     label: 'Masque respiratoire' },
  { value: 'dust_mask',      label: 'Masque poussiere'    },
  { value: 'safety_gloves',  label: 'Gants securite'      },
  { value: 'cut_gloves',     label: 'Gants anti-coupure'  },
  { value: 'chemical_gloves',label: 'Gants chimiques'     },
  { value: 'safety_boots',   label: 'Bottes securite'     },
  { value: 'coverall',       label: 'Combinaison'         },
  { value: 'high_vis_vest',  label: 'Gilet haute-vis.'    },
  { value: 'fall_harness',   label: 'Harnais antichute'   },
  { value: 'safety_belt',    label: 'Ceinture securite'   },
  { value: 'welding_mask',   label: 'Masque soudeur'      },
  { value: 'apron',          label: 'Tablier'             },
  { value: 'knee_pads',      label: 'Genouilleres'        },
  { value: 'other',          label: 'Autre'               },
];

const PROTECTION_LEVELS = [
  { value: 'basic',        label: 'Basique'       },
  { value: 'intermediate', label: 'Intermediaire' },
  { value: 'advanced',     label: 'Avancee'       },
  { value: 'specialist',   label: 'Specialiste'   },
];

const CURRENCIES = ['USD', 'CDF', 'EUR', 'ZAR'];

const ACTION_ICON_MAP: Record<string, string> = {
  created:       'add-circle',
  updated:       'pencil',
  deleted:       'trash',
  stock_added:   'arrow-up-circle',
  stock_removed: 'arrow-down-circle',
  assigned:      'person-add',
  returned:      'return-down-back',
  inspected:     'checkmark-circle',
  deactivated:   'close-circle',
  reactivated:   'refresh-circle',
};

const ACTION_COLOR_MAP: Record<string, string> = {
  created:       '#22C55E',
  updated:       '#3B82F6',
  deleted:       '#EF4444',
  stock_added:   '#10B981',
  stock_removed: '#F59E0B',
  assigned:      '#6366F1',
  returned:      '#8B5CF6',
  inspected:     '#0891B2',
  deactivated:   '#94A3B8',
  reactivated:   '#22C55E',
};

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function getCat(val: string) {
  return CATEGORIES.find(c => c.value === val) ?? CATEGORIES[CATEGORIES.length - 1];
}

function safeDate(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('fr-CD');
}

function isExpiringSoon(d: string | null | undefined) {
  if (!d) return false;
  return new Date(d) < new Date(Date.now() + 90 * 86400000);
}

function blankForm(): PPECatalogItem {
  return {
    ppe_type: 'other', category: 'body', name: '', description: '',
    brand: '', model_number: '', part_number: '', colour_size: '',
    certification_standard: '', certification_number: '',
    certification_body: '', certification_expiry: null,
    risk_protection_level: 'basic',
    stock_quantity: 0, assigned_quantity: 0,
    minimum_stock_level: 10, reorder_point: 20,
    storage_location: '', batch_number: '',
    manufacture_date: null, expiry_date: null,
    max_lifespan_months: null, maintenance_interval_months: null,
    unit_price: 0, currency: 'USD',
    supplier: '', supplier_contact: '', supplier_reference: '',
    compatible_hazard_types: [],
    is_active: true, notes: '',
  };
}

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────
function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, gap: 8 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '500', color: accent ? ACCENT : colors.text, maxWidth: '55%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.7 }}>
      {title}
    </Text>
  );
}

function FormField({ label, children, error, hint }: {
  label: string; children: React.ReactNode; error?: string; hint?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[s.formLabel, error ? { color: '#EF4444' } : {}]}>{label}</Text>
      {hint ? <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{hint}</Text> : null}
      {children}
      {error ? <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// PPE CARD
// ──────────────────────────────────────────────────────────────
function PPECard({ item, onPress }: { item: PPECatalogItem; onPress: () => void }) {
  const cat    = getCat(item.category);
  const avail  = item.available_quantity ?? Math.max(0, item.stock_quantity - item.assigned_quantity);
  const lowSt  = item.is_low_stock || avail < item.minimum_stock_level;
  const expSoon = isExpiringSoon(item.expiry_date);
  const expired  = item.is_expired;
  const certExp  = item.is_certification_expired;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={[s.iconCircle, { backgroundColor: cat.color + '18' }]}>
          <Ionicons name={cat.icon as any} size={22} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            {!item.is_active  && <View style={[s.badge, { backgroundColor: '#94A3B820' }]}><Text style={[s.badgeText, { color: '#94A3B8' }]}>INACTIF</Text></View>}
            {lowSt            && <View style={[s.badge, { backgroundColor: '#EF444420' }]}><Text style={[s.badgeText, { color: '#EF4444' }]}>STOCK BAS</Text></View>}
            {expired          && <View style={[s.badge, { backgroundColor: '#EF444430' }]}><Text style={[s.badgeText, { color: '#EF4444' }]}>EXPIRE</Text></View>}
            {!expired && expSoon && <View style={[s.badge, { backgroundColor: '#F59E0B20' }]}><Text style={[s.badgeText, { color: '#F59E0B' }]}>EXPIRE BIENTOT</Text></View>}
            {certExp          && <View style={[s.badge, { backgroundColor: '#F59E0B20' }]}><Text style={[s.badgeText, { color: '#F59E0B' }]}>CERT EXPIREE</Text></View>}
          </View>
          <Text style={s.cardSub}>{item.brand} {item.model_number}</Text>
        </View>
        <View style={[s.catBadge, { backgroundColor: cat.color + '18' }]}>
          <Text style={[s.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>
      </View>

      <View style={s.stockRow}>
        {[
          { label: 'Stock',       value: item.stock_quantity,       color: colors.text  },
          { label: 'Attribues',   value: item.assigned_quantity,    color: ACCENT       },
          { label: 'Disponibles', value: avail,                     color: lowSt ? '#EF4444' : '#22C55E' },
          { label: `${item.currency}/u`, value: item.unit_price.toFixed(2), color: '#059669' },
        ].map(st => (
          <View key={st.label} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[s.stockVal, { color: st.color }]}>{st.value}</Text>
            <Text style={s.stockLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
          {item.certification_standard || 'Aucune norme'}
        </Text>
        {item.expiry_date && (
          <Text style={{ fontSize: 11, color: expired ? '#EF4444' : colors.textSecondary }}>
            Exp: {safeDate(item.expiry_date)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
// DETAIL MODAL
// ──────────────────────────────────────────────────────────────
function PPEDetailModal({ visible, item, onClose, onEdit, onDelete, onAdjustStock }: {
  visible: boolean; item: PPECatalogItem | null;
  onClose: () => void; onEdit: () => void;
  onDelete: () => void; onAdjustStock: () => void;
}) {
  if (!item) return null;
  const cat   = getCat(item.category);
  const avail = item.available_quantity ?? Math.max(0, item.stock_quantity - item.assigned_quantity);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: '92%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={s.sheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={[s.iconCircleLg, { backgroundColor: cat.color + '18' }]}>
                  <Ionicons name={cat.icon as any} size={28} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetTitle}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {item.brand} {item.model_number} · {cat.label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Stock summary */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Stock',   value: item.stock_quantity,    color: colors.text },
                { label: 'Attribues',     value: item.assigned_quantity, color: ACCENT      },
                { label: 'Disponibles',   value: avail, color: avail < item.minimum_stock_level ? '#EF4444' : '#22C55E' },
              ].map(st => (
                <View key={st.label} style={[s.summaryCard, { flex: 1 }]}>
                  <Text style={[s.summaryVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.summaryLbl}>{st.label}</Text>
                </View>
              ))}
            </View>

            {/* General */}
            <View style={s.section}>
              <SectionTitle title="Informations Generales" />
              <DetailRow label="Description"   value={item.description || '—'} />
              <DetailRow label="Type EPI"      value={item.ppe_type_display || item.ppe_type} />
              <DetailRow label="Marque/Modele" value={`${item.brand} ${item.model_number}`.trim() || '—'} />
              <DetailRow label="Ref. Piece"    value={item.part_number || '—'} />
              <DetailRow label="Couleur/Taille" value={item.colour_size || '—'} />
              <DetailRow label="Statut"        value={item.is_active ? 'Actif' : 'Inactif'} accent={item.is_active} />
              <DetailRow label="Remarques"     value={item.notes || '—'} />
            </View>

            {/* Certification */}
            <View style={s.section}>
              <SectionTitle title="Certification & Protection" />
              <DetailRow label="Norme"         value={item.certification_standard || '—'} />
              <DetailRow label="N Certificat"  value={item.certification_number || '—'} />
              <DetailRow label="Organisme"     value={item.certification_body || '—'} />
              <DetailRow label="Exp. Certif."  value={safeDate(item.certification_expiry)} accent={!item.is_certification_expired} />
              <DetailRow label="Niveau Prot."  value={item.risk_protection_level || '—'} />
              {(item.compatible_hazard_types?.length ?? 0) > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Dangers couverts</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {item.compatible_hazard_types.map(h => (
                      <View key={h} style={{ backgroundColor: ACCENT + '18', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600' }}>
                          {HAZARD_TYPES.find(x => x.value === h)?.label || h}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Stock & Logistics */}
            <View style={s.section}>
              <SectionTitle title="Stock & Logistique" />
              <DetailRow label="Stock minimum"        value={String(item.minimum_stock_level)} />
              <DetailRow label="Pt reapprovisionnement" value={String(item.reorder_point)} />
              <DetailRow label="Lieu stockage"        value={item.storage_location || '—'} />
              <DetailRow label="N lot"                value={item.batch_number || '—'} />
              <DetailRow label="Date fabrication"     value={safeDate(item.manufacture_date)} />
              <DetailRow label="Date peremption"      value={safeDate(item.expiry_date)} accent={!item.is_expired} />
              <DetailRow label="Duree vie max (mois)" value={item.max_lifespan_months ? String(item.max_lifespan_months) : '—'} />
              <DetailRow label="Maint. interval (mois)" value={item.maintenance_interval_months ? String(item.maintenance_interval_months) : '—'} />
              <DetailRow label="Valeur totale stock"
                value={`${item.currency} ${(item.total_value ?? item.stock_quantity * item.unit_price).toFixed(2)}`}
                accent
              />
            </View>

            {/* Commercial */}
            <View style={s.section}>
              <SectionTitle title="Fournisseur & Commercial" />
              <DetailRow label="Fournisseur"    value={item.supplier || '—'} />
              <DetailRow label="Contact"        value={item.supplier_contact || '—'} />
              <DetailRow label="Ref. fourn."    value={item.supplier_reference || '—'} />
              <DetailRow label="Prix unitaire"  value={`${item.currency} ${item.unit_price.toFixed(2)}`} />
            </View>

            {/* Audit trail */}
            {(item.recent_audit_logs?.length ?? 0) > 0 && (
              <View style={s.section}>
                <SectionTitle title="Journal des Modifications" />
                {item.recent_audit_logs!.map(log => {
                  const iconName  = ACTION_ICON_MAP[log.action]  || 'ellipse';
                  const iconColor = ACTION_COLOR_MAP[log.action] || '#94A3B8';
                  return (
                    <View key={log.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={iconName as any} size={14} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <View style={[s.badge, { backgroundColor: iconColor + '18' }]}>
                              <Text style={[s.badgeText, { color: iconColor }]}>{log.action_display}</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{log.actor_full_name}</Text>
                          </View>
                          {log.notes ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 3 }}>{log.notes}</Text> : null}
                          {log.worker_name ? <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Travailleur: {log.worker_name}</Text> : null}
                          {Object.keys(log.changes || {}).length > 0 && (
                            <View style={{ marginTop: 4 }}>
                              {Object.entries(log.changes).map(([field, diff]) => (
                                <Text key={field} style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'monospace' }}>
                                  {field}: {diff.old ?? '—'} → {diff.new ?? '—'}
                                </Text>
                              ))}
                            </View>
                          )}
                          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
                            {new Date(log.timestamp).toLocaleString('fr-CD')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Metadata */}
            <View style={[s.section, { borderBottomWidth: 0 }]}>
              <SectionTitle title="Metadonnees" />
              {item.created_by_name && <DetailRow label="Cree par"    value={item.created_by_name} />}
              {item.created_at      && <DetailRow label="Cree le"     value={new Date(item.created_at).toLocaleString('fr-CD')} />}
              {item.updated_by_name && <DetailRow label="Modifie par" value={item.updated_by_name} />}
              {item.updated_at      && <DetailRow label="Modifie le"  value={new Date(item.updated_at).toLocaleString('fr-CD')} />}
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF4444' }]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color="#FFF" />
              <Text style={[s.actionBtnTxt, { color: '#FFF' }]}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B981' }]} onPress={onAdjustStock}>
              <Ionicons name="cube-outline" size={16} color="#FFF" />
              <Text style={[s.actionBtnTxt, { color: '#FFF' }]}>Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: ACCENT }]} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={16} color="#FFF" />
              <Text style={[s.actionBtnTxt, { color: '#FFF' }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[s.actionBtnTxt, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// STOCK ADJUST MODAL
// ──────────────────────────────────────────────────────────────
function StockAdjustModal({ visible, item, onClose, onSave }: {
  visible: boolean; item: PPECatalogItem | null;
  onClose: () => void;
  onSave: (delta: number, notes: string) => Promise<void>;
}) {
  const [delta,  setDelta]  = useState('');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useSimpleToast();

  if (!item) return null;

  const handleSave = async () => {
    const d = parseInt(delta.replace(/\s/g, ''), 10);
    if (isNaN(d) || d === 0) { showToast('Entrez une quantite non nulle (ex: 50 ou -5)', 'error'); return; }
    if (item.stock_quantity + d < 0) { showToast('Le stock ne peut pas etre negatif', 'error'); return; }
    setSaving(true);
    try { await onSave(d, notes.trim()); setDelta(''); setNotes(''); }
    finally { setSaving(false); }
  };

  const d       = parseInt(delta.replace(/\s/g, ''), 10) || 0;
  const preview = item.stock_quantity + d;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: '55%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Ajuster Stock — {item.name}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 14 }}>
            {'Stock actuel: '}
            <Text style={{ fontWeight: '700', color: colors.text }}>{item.stock_quantity}</Text>
            {d !== 0 && (
              <Text style={{ color: preview < 0 ? '#EF4444' : '#22C55E' }}>{'  →  '}{preview}</Text>
            )}
          </Text>

          <FormField label="Quantite (+ ajout / - retrait) *">
            <TextInput style={s.formInput} value={delta} onChangeText={setDelta}
              placeholder="Ex: 50 ou -10" keyboardType="numbers-and-punctuation" editable={!saving} />
          </FormField>
          <FormField label="Motif / Notes">
            <TextInput style={[s.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
              value={notes} onChangeText={setNotes}
              placeholder="Ex: Livraison fournisseur - BL n 12345"
              multiline editable={!saving} />
          </FormField>

          <View style={[s.actionRow, { marginTop: 6 }]}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surfaceVariant, opacity: saving ? 0.6 : 1 }]} onPress={onClose} disabled={saving}>
              <Text style={[s.actionBtnTxt, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: ACCENT, opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <><Ionicons name="save-outline" size={16} color="#FFF" /><Text style={[s.actionBtnTxt, { color: '#FFF' }]}>Appliquer</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// ADD / EDIT FORM MODAL
// ──────────────────────────────────────────────────────────────
type FormTab = 'general' | 'cert' | 'stock' | 'commercial';

function PPEFormModal({ visible, initial, onClose, onSave }: {
  visible: boolean;
  initial: PPECatalogItem | null;
  onClose: () => void;
  onSave: (data: PPECatalogItem) => Promise<void>;
}) {
  const isEdit = !!initial?.id;
  const { showToast } = useSimpleToast();
  const [form,   setForm]   = useState<PPECatalogItem>(blankForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [tab,    setTab]    = useState<FormTab>('general');

  useEffect(() => {
    if (visible) { setForm(initial ?? blankForm()); setErrors({}); setTab('general'); }
  }, [visible, initial]);

  const set = <K extends keyof PPECatalogItem>(field: K, value: PPECatalogItem[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleHazard = (h: string) => {
    const list = form.compatible_hazard_types.includes(h)
      ? form.compatible_hazard_types.filter(x => x !== h)
      : [...form.compatible_hazard_types, h];
    set('compatible_hazard_types', list);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())           e.name           = 'Le nom est obligatoire';
    if (!form.category)              e.category       = 'La categorie est obligatoire';
    if (form.stock_quantity < 0)     e.stock_quantity = 'Stock >= 0';
    if (form.minimum_stock_level < 0) e.minimum_stock_level = 'Stock min >= 0';
    if (form.unit_price < 0)         e.unit_price     = 'Prix >= 0';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); showToast('Corrigez les erreurs avant de continuer', 'error'); return; }
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  const TABS: { id: FormTab; label: string; icon: string }[] = [
    { id: 'general',    label: 'General',  icon: 'information-circle-outline' },
    { id: 'cert',       label: 'Certif.',  icon: 'ribbon-outline'             },
    { id: 'stock',      label: 'Stock',    icon: 'cube-outline'               },
    { id: 'commercial', label: 'Commerc.', icon: 'cash-outline'               },
  ];

  const tabHasErr = (t: FormTab) => {
    const map: Record<FormTab, string[]> = {
      general: ['name', 'category'], cert: [], stock: ['stock_quantity', 'minimum_stock_level'], commercial: ['unit_price'],
    };
    return map[t].some(f => errors[f]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !saving && onClose()}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: '94%' }]}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{isEdit ? 'Modifier EPI' : 'Nouvel EPI'}</Text>
            <TouchableOpacity onPress={() => !saving && onClose()} disabled={saving}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', marginBottom: 16, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.outline }}>
            {TABS.map(t => {
              const active  = tab === t.id;
              const hasErr  = tabHasErr(t.id);
              return (
                <TouchableOpacity key={t.id}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: active ? ACCENT : colors.surfaceVariant, flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                  onPress={() => setTab(t.id)}>
                  <Ionicons name={t.icon as any} size={13} color={active ? '#FFF' : hasErr ? '#EF4444' : colors.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#FFF' : hasErr ? '#EF4444' : colors.textSecondary }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* ── GENERAL ── */}
            {tab === 'general' && (<>
              <FormField label="Nom *" error={errors.name}>
                <TextInput style={[s.formInput, errors.name ? s.inputError : {}]} value={form.name} onChangeText={v => set('name', v)} placeholder="Ex: Casque de securite anti-choc" editable={!saving} />
              </FormField>

              <FormField label="Categorie *" error={errors.category}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(c => {
                    const sel = form.category === c.value;
                    return (
                      <TouchableOpacity key={c.value} style={[s.chip, sel ? { backgroundColor: c.color + '20', borderColor: c.color } : {}]} onPress={() => set('category', c.value)} disabled={saving}>
                        <Ionicons name={c.icon as any} size={11} color={sel ? c.color : colors.textSecondary} />
                        <Text style={[s.chipText, sel ? { color: c.color, fontWeight: '600' } : {}]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormField>

              <FormField label="Type EPI">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {PPE_TYPES.map(p => {
                    const sel = form.ppe_type === p.value;
                    return (
                      <TouchableOpacity key={p.value} style={[s.chip, sel ? { backgroundColor: ACCENT + '20', borderColor: ACCENT } : {}]} onPress={() => set('ppe_type', p.value)} disabled={saving}>
                        <Text style={[s.chipText, sel ? { color: ACCENT, fontWeight: '600' } : {}]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormField>

              <FormField label="Marque">
                <TextInput style={s.formInput} value={form.brand} onChangeText={v => set('brand', v)} placeholder="Ex: MSA, 3M, Drager" editable={!saving} />
              </FormField>
              <FormField label="Modele / Reference">
                <TextInput style={s.formInput} value={form.model_number} onChangeText={v => set('model_number', v)} placeholder="Ex: V-Gard 500" editable={!saving} />
              </FormField>
              <FormField label="N Piece">
                <TextInput style={s.formInput} value={form.part_number} onChangeText={v => set('part_number', v)} placeholder="Reference interne piece" editable={!saving} />
              </FormField>
              <FormField label="Couleur / Taille">
                <TextInput style={s.formInput} value={form.colour_size} onChangeText={v => set('colour_size', v)} placeholder="Ex: Jaune, L/XL" editable={!saving} />
              </FormField>

              <FormField label="Description">
                <TextInput style={[s.formInput, { minHeight: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={v => set('description', v)} placeholder="Description detaillee de l EPI..." multiline editable={!saving} />
              </FormField>

              <FormField label="Types de dangers couverts">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {HAZARD_TYPES.map(h => {
                    const sel = form.compatible_hazard_types.includes(h.value);
                    return (
                      <TouchableOpacity key={h.value} style={[s.chip, sel ? { backgroundColor: ACCENT + '20', borderColor: ACCENT } : {}]} onPress={() => toggleHazard(h.value)} disabled={saving}>
                        <Text style={[s.chipText, sel ? { color: ACCENT, fontWeight: '600' } : {}]}>{h.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormField>

              <FormField label="Remarques">
                <TextInput style={[s.formInput, { minHeight: 60, textAlignVertical: 'top' }]} value={form.notes} onChangeText={v => set('notes', v)} placeholder="Observations, restrictions..." multiline editable={!saving} />
              </FormField>

              <FormField label="Statut">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {([true, false] as const).map(v => (
                    <TouchableOpacity key={String(v)} style={[s.chip, form.is_active === v ? { backgroundColor: (v ? '#22C55E' : '#EF4444') + '20', borderColor: v ? '#22C55E' : '#EF4444' } : {}]} onPress={() => set('is_active', v)} disabled={saving}>
                      <Text style={[s.chipText, form.is_active === v ? { color: v ? '#22C55E' : '#EF4444', fontWeight: '600' } : {}]}>
                        {v ? 'Actif' : 'Inactif'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>
            </>)}

            {/* ── CERTIFICATION ── */}
            {tab === 'cert' && (<>
              <FormField label="Norme de certification" hint="Ex: EN 397:2012, ANSI Z87.1, EN ISO 20345">
                <TextInput style={s.formInput} value={form.certification_standard} onChangeText={v => set('certification_standard', v)} placeholder="Norme applicable" editable={!saving} />
              </FormField>
              <FormField label="N Certificat">
                <TextInput style={s.formInput} value={form.certification_number} onChangeText={v => set('certification_number', v)} placeholder="N du certificat de conformite" editable={!saving} />
              </FormField>
              <FormField label="Organisme certificateur">
                <TextInput style={s.formInput} value={form.certification_body} onChangeText={v => set('certification_body', v)} placeholder="Ex: DEKRA, Bureau Veritas, SGS" editable={!saving} />
              </FormField>
              <FormField label="Date expiration certification">
                <TextInput style={s.formInput} value={form.certification_expiry || ''} onChangeText={v => set('certification_expiry', v || null)} placeholder="AAAA-MM-JJ" editable={!saving} />
              </FormField>
              <FormField label="Niveau de protection">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {PROTECTION_LEVELS.map(p => {
                    const sel = form.risk_protection_level === p.value;
                    return (
                      <TouchableOpacity key={p.value} style={[s.chip, sel ? { backgroundColor: ACCENT + '20', borderColor: ACCENT } : {}]} onPress={() => set('risk_protection_level', p.value)} disabled={saving}>
                        <Text style={[s.chipText, sel ? { color: ACCENT, fontWeight: '600' } : {}]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FormField>
            </>)}

            {/* ── STOCK ── */}
            {tab === 'stock' && (<>
              <FormField label="Quantite en stock *" error={errors.stock_quantity}>
                <TextInput style={[s.formInput, errors.stock_quantity ? s.inputError : {}]} value={String(form.stock_quantity)} onChangeText={v => set('stock_quantity', parseInt(v) || 0)} keyboardType="numeric" editable={!saving} />
              </FormField>
              <FormField label="Stock minimum alerte" error={errors.minimum_stock_level} hint="Alerte stock bas en dessous de ce seuil">
                <TextInput style={[s.formInput, errors.minimum_stock_level ? s.inputError : {}]} value={String(form.minimum_stock_level)} onChangeText={v => set('minimum_stock_level', parseInt(v) || 0)} keyboardType="numeric" editable={!saving} />
              </FormField>
              <FormField label="Point de reapprovisionnement" hint="Commander quand le disponible atteint ce seuil">
                <TextInput style={s.formInput} value={String(form.reorder_point)} onChangeText={v => set('reorder_point', parseInt(v) || 0)} keyboardType="numeric" editable={!saving} />
              </FormField>
              <FormField label="Lieu de stockage">
                <TextInput style={s.formInput} value={form.storage_location} onChangeText={v => set('storage_location', v)} placeholder="Ex: Magasin A / Etagere 3" editable={!saving} />
              </FormField>
              <FormField label="Numero de lot">
                <TextInput style={s.formInput} value={form.batch_number} onChangeText={v => set('batch_number', v)} placeholder="N lot fabricant" editable={!saving} />
              </FormField>
              <FormField label="Date de fabrication">
                <TextInput style={s.formInput} value={form.manufacture_date || ''} onChangeText={v => set('manufacture_date', v || null)} placeholder="AAAA-MM-JJ" editable={!saving} />
              </FormField>
              <FormField label="Date de peremption / expiration">
                <TextInput style={s.formInput} value={form.expiry_date || ''} onChangeText={v => set('expiry_date', v || null)} placeholder="AAAA-MM-JJ" editable={!saving} />
              </FormField>
              <FormField label="Duree de vie max (mois)" hint="Duree maximale depuis la date d attribution">
                <TextInput style={s.formInput} value={form.max_lifespan_months ? String(form.max_lifespan_months) : ''} onChangeText={v => set('max_lifespan_months', v ? parseInt(v) : null)} keyboardType="numeric" placeholder="Ex: 24" editable={!saving} />
              </FormField>
              <FormField label="Intervalle maintenance (mois)">
                <TextInput style={s.formInput} value={form.maintenance_interval_months ? String(form.maintenance_interval_months) : ''} onChangeText={v => set('maintenance_interval_months', v ? parseInt(v) : null)} keyboardType="numeric" placeholder="Ex: 6" editable={!saving} />
              </FormField>
            </>)}

            {/* ── COMMERCIAL ── */}
            {tab === 'commercial' && (<>
              <FormField label="Prix unitaire *" error={errors.unit_price}>
                <TextInput style={[s.formInput, errors.unit_price ? s.inputError : {}]} value={String(form.unit_price)} onChangeText={v => set('unit_price', parseFloat(v) || 0)} keyboardType="numeric" editable={!saving} />
              </FormField>
              <FormField label="Devise">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CURRENCIES.map(c => (
                    <TouchableOpacity key={c} style={[s.chip, form.currency === c ? { backgroundColor: ACCENT + '20', borderColor: ACCENT } : {}]} onPress={() => set('currency', c)} disabled={saving}>
                      <Text style={[s.chipText, form.currency === c ? { color: ACCENT, fontWeight: '700' } : {}]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>
              <FormField label="Fournisseur">
                <TextInput style={s.formInput} value={form.supplier} onChangeText={v => set('supplier', v)} placeholder="Nom fournisseur" editable={!saving} />
              </FormField>
              <FormField label="Contact fournisseur">
                <TextInput style={s.formInput} value={form.supplier_contact} onChangeText={v => set('supplier_contact', v)} placeholder="Tel / Email" editable={!saving} />
              </FormField>
              <FormField label="Reference fournisseur">
                <TextInput style={s.formInput} value={form.supplier_reference} onChangeText={v => set('supplier_reference', v)} placeholder="Ref article cote fournisseur" editable={!saving} />
              </FormField>
            </>)}
          </ScrollView>

          <View style={[s.actionRow, { marginTop: 14 }]}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.surfaceVariant, opacity: saving ? 0.6 : 1 }]} onPress={() => !saving && onClose()} disabled={saving}>
              <Text style={[s.actionBtnTxt, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: ACCENT, opacity: saving ? 0.6 : 1 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <><Ionicons name="save-outline" size={16} color="#FFF" /><Text style={[s.actionBtnTxt, { color: '#FFF' }]}>{isEdit ? 'Mettre a jour' : 'Enregistrer'}</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// MAIN SCREEN
// ──────────────────────────────────────────────────────────────
export function PPEManagementScreen() {
  const { toastMsg, showToast } = useSimpleToast();
  const { width } = useWindowDimensions();

  const [items,       setItems]       = useState<PPECatalogItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat,   setFilterCat]   = useState('all');
  const [selectedItem, setSelectedItem] = useState<PPECatalogItem | null>(null);
  const [showDetail,  setShowDetail]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<PPECatalogItem | null>(null);
  const [showStock,   setShowStock]   = useState(false);

  // ── Auth headers ──────────────────────────────────────────
  const getHeaders = useCallback(async () => {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) throw new Error('Non authentifie');
    return { Authorization: `Token ${token}`, 'Content-Type': 'application/json' };
  }, []);

  // ── Load ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE}/api/v1/occupational-health/ppe-catalog/`, { headers, timeout: 10000 });
      setItems(Array.isArray(res.data) ? res.data : (res.data.results ?? []));
    } catch (err: any) {
      console.warn('[PPE] load error:', err?.message);
      showToast('Impossible de charger le catalogue EPI', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => { loadData(); }, []);

  // ── Create ────────────────────────────────────────────────
  const handleCreate = async (data: PPECatalogItem) => {
    const headers = await getHeaders();
    await axios.post(`${API_BASE}/api/v1/occupational-health/ppe-catalog/`, data, { headers, timeout: 10000 });
    showToast('EPI ajoute au catalogue', 'success');
    setShowForm(false); setEditTarget(null);
    await loadData();
  };

  // ── Update ────────────────────────────────────────────────
  const handleUpdate = async (data: PPECatalogItem) => {
    const headers = await getHeaders();
    await axios.patch(`${API_BASE}/api/v1/occupational-health/ppe-catalog/${data.id}/`, data, { headers, timeout: 10000 });
    showToast('EPI mis a jour', 'success');
    setShowForm(false); setEditTarget(null); setShowDetail(false);
    await loadData();
  };

  const handleFormSave = async (data: PPECatalogItem) => {
    try {
      if (data.id) { await handleUpdate(data); }
      else         { await handleCreate(data); }
    } catch (err: any) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(' | ')
        : 'Erreur lors de la sauvegarde';
      showToast(msg, 'error');
      throw err;
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = (item: PPECatalogItem) => {
    Alert.alert(
      'Supprimer l EPI',
      `Supprimer definitivement "${item.name}" ? Cette action est irréversible et sera consignée dans le journal d audit.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getHeaders();
              await axios.delete(`${API_BASE}/api/v1/occupational-health/ppe-catalog/${item.id}/`, { headers, timeout: 8000 });
              showToast('EPI supprime', 'success');
              setShowDetail(false); setSelectedItem(null);
              await loadData();
            } catch { showToast('Erreur lors de la suppression', 'error'); }
          },
        },
      ]
    );
  };

  // ── Stock adjust ──────────────────────────────────────────
  const handleAdjustStock = async (delta: number, notes: string) => {
    if (!selectedItem?.id) return;
    const headers = await getHeaders();
    const res = await axios.post(
      `${API_BASE}/api/v1/occupational-health/ppe-catalog/${selectedItem.id}/adjust_stock/`,
      { delta, notes },
      { headers, timeout: 8000 },
    );
    showToast(`Stock ajuste: ${delta > 0 ? '+' : ''}${delta}`, 'success');
    setShowStock(false);
    const updated: PPECatalogItem = res.data;
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedItem(updated);
  };

  // ── Filtered items ────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(i => {
      const mQ = !q || i.name.toLowerCase().includes(q)
        || (i.brand || '').toLowerCase().includes(q)
        || (i.model_number || '').toLowerCase().includes(q)
        || (i.supplier || '').toLowerCase().includes(q);
      const mC = filterCat === 'all' || i.category === filterCat;
      return mQ && mC;
    });
  }, [items, searchQuery, filterCat]);

  // ── Statistics ────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = items.filter(i => i.is_active);
    return {
      totalItems:    active.length,
      totalStock:    active.reduce((a, i) => a + i.stock_quantity, 0),
      totalAssigned: active.reduce((a, i) => a + i.assigned_quantity, 0),
      available:     active.reduce((a, i) => a + (i.available_quantity ?? Math.max(0, i.stock_quantity - i.assigned_quantity)), 0),
      lowStock:      active.filter(i => i.is_low_stock || (i.stock_quantity - i.assigned_quantity) < i.minimum_stock_level).length,
      expiring:      active.filter(i => isExpiringSoon(i.expiry_date) && !i.is_expired).length,
      expired:       active.filter(i => i.is_expired).length,
      totalVal:      active.reduce((a, i) => a + (i.total_value ?? i.stock_quantity * i.unit_price), 0),
    };
  }, [items]);

  // ─────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: width >= 1024 ? 32 : 16, paddingBottom: 40 }}>

      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <View>
          <Text style={s.pageTitle}>Gestion des EPI</Text>
          <Text style={s.pageSubtitle}>Equipements de Protection Individuelle — Catalogue & Suivi ISO 45001</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditTarget(null); setShowForm(true); }}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={s.addBtnTxt}>Nouvel EPI</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { label: 'Articles actifs',  value: stats.totalItems,                icon: 'shield',           color: ACCENT     },
            { label: 'Stock total',      value: stats.totalStock,                icon: 'cube',             color: '#3B82F6'  },
            { label: 'Attribues',        value: stats.totalAssigned,             icon: 'people',           color: '#6366F1'  },
            { label: 'Disponibles',      value: stats.available,                 icon: 'checkmark-circle', color: '#22C55E'  },
            { label: 'Stock bas',        value: stats.lowStock,                  icon: 'alert',            color: '#EF4444'  },
            { label: 'Expire bientot',   value: stats.expiring,                  icon: 'timer-outline',    color: '#F59E0B'  },
            { label: 'Expires',          value: stats.expired,                   icon: 'close-circle',     color: '#DC2626'  },
            { label: 'Valeur catalogue', value: `$${stats.totalVal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`, icon: 'cash', color: '#059669' },
          ].map(st => (
            <View key={st.label} style={[s.statCard, { backgroundColor: st.color }]}>
              <Ionicons name={st.icon as any} size={20} color="#FFF" />
              <Text style={s.statVal}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── Search + category filter ── */}
      <View style={{ gap: 10, marginBottom: 14 }}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={{ flex: 1, fontSize: 14, color: colors.text }} value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Rechercher nom, marque, fournisseur..." placeholderTextColor={colors.placeholder} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ value: 'all', label: 'Tous', icon: 'list', color: ACCENT }, ...CATEGORIES].map(c => {
              const active = filterCat === c.value;
              const color  = (c as any).color || ACCENT;
              return (
                <TouchableOpacity key={c.value} style={[s.chip, active ? { backgroundColor: color, borderColor: color } : {}]} onPress={() => setFilterCat(c.value)}>
                  {(c as any).icon && <Ionicons name={(c as any).icon as any} size={12} color={active ? '#FFF' : colors.textSecondary} />}
                  <Text style={[s.chipText, active ? { color: '#FFF', fontWeight: '600' } : {}]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ── Count ── */}
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}>
        {loading ? 'Chargement...' : `${filtered.length} article(s) — ${items.length} au total`}
      </Text>

      {/* ── List ── */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Chargement du catalogue...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 8 }}>
          <Ionicons name="body-outline" size={48} color={colors.textTertiary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>
            {items.length === 0 ? 'Catalogue vide' : 'Aucun resultat'}
          </Text>
          {items.length === 0 && (
            <TouchableOpacity style={[s.addBtn, { marginTop: 8 }]} onPress={() => { setEditTarget(null); setShowForm(true); }}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={s.addBtnTxt}>Ajouter le premier EPI</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map(item => (
            <PPECard key={String(item.id)} item={item}
              onPress={() => { setSelectedItem(item); setShowDetail(true); }} />
          ))}
        </View>
      )}

      {/* ── Modals ── */}
      <PPEDetailModal
        visible={showDetail}
        item={selectedItem}
        onClose={() => { setShowDetail(false); setSelectedItem(null); }}
        onEdit={() => { setEditTarget(selectedItem); setShowDetail(false); setShowForm(true); }}
        onDelete={() => selectedItem && handleDelete(selectedItem)}
        onAdjustStock={() => setShowStock(true)}
      />

      <PPEFormModal
        visible={showForm}
        initial={editTarget}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        onSave={handleFormSave}
      />

      <StockAdjustModal
        visible={showStock}
        item={selectedItem}
        onClose={() => setShowStock(false)}
        onSave={handleAdjustStock}
      />

      <SimpleToastNotification message={toastMsg} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  pageTitle:   { fontSize: 24, fontWeight: '700', color: colors.text },
  pageSubtitle:{ fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addBtnTxt:   { color: '#FFF', fontWeight: '600', fontSize: 14 },

  statCard:    { borderRadius: borderRadius.xl, padding: 14, alignItems: 'center', minWidth: 110, gap: 4, ...shadows.md },
  statVal:     { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 4 },
  statLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },

  card:        { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  iconCircle:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconCircleLg:{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardName:    { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub:     { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  badge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  badgeText:   { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  catBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  catBadgeText:{ fontSize: 10, fontWeight: '700' },
  stockRow:    { flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.outline, borderBottomWidth: 1, borderBottomColor: colors.outline, marginVertical: 8 },
  stockVal:    { fontSize: 18, fontWeight: '700' },
  stockLbl:    { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet:       { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: '100%', maxWidth: 640, padding: 24, ...shadows.xl },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle:  { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },

  section:     { marginBottom: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  summaryCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 14, alignItems: 'center' },
  summaryVal:  { fontSize: 24, fontWeight: '800' },
  summaryLbl:  { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  actionRow:   { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionBtn:   { flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnTxt:{ fontWeight: '600', fontSize: 13 },

  formLabel:   { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 5 },
  formInput:   { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  inputError:  { borderColor: '#EF4444', borderWidth: 2 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  chipText:    { fontSize: 11, color: colors.textSecondary },
});
