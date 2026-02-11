# 📦 Inventory Management — Workflow & Architecture

> HK Management Systems — Module Pharmacie  
> Dernière mise à jour : Juin 2025

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Écran principal — Flux utilisateur](#4-écran-principal--flux-utilisateur)
5. [KPI Dashboard](#5-kpi-dashboard)
6. [Analyse ABC](#6-analyse-abc)
7. [Catalogue (onglet)](#7-catalogue-onglet)
8. [Lots & Expiration (onglet)](#8-lots--expiration-onglet)
9. [Mouvements (onglet)](#9-mouvements-onglet)
10. [Alertes (onglet)](#10-alertes-onglet)
11. [CRUD Produit — Formulaire](#11-crud-produit--formulaire)
12. [Ajustement de Stock](#12-ajustement-de-stock)
13. [Suppression de Produit](#13-suppression-de-produit)
14. [Cas limites gérés](#14-cas-limites-gérés)
15. [Intégration POS](#15-intégration-pos)
16. [Roadmap](#16-roadmap)

---

## 1. Vue d'ensemble

Le module Inventaire est le cœur du système de gestion pharmaceutique. Il fournit :

- **Dashboard KPI** temps réel (total produits, stock bas, ruptures, expirations, marge, alertes)
- **Analyse ABC** automatique par valeur de stock
- **4 onglets** : Catalogue, Lots & Expiration, Mouvements, Alertes
- **CRUD complet** des produits avec formulaire avancé
- **Ajustement de stock** avec traçabilité complète
- **Recherche, filtrage, tri** multi-critères

### Stack

| Composant | Technologie |
|-----------|------------|
| UI | React Native + Expo (Web/Desktop) |
| Navigation | React Navigation + Desktop routing (≥1024px) |
| État | useState/useMemo/useCallback (composant local) |
| Données | DatabaseService (in-memory, singleton) |
| Feedback | useToast (success/error/warning/info) |
| Thème | colors, borderRadius, shadows, spacing, typography |

---

## 2. Architecture technique

```
InventoryScreen.tsx (~1700 lignes)
├── Utilitaires
│   ├── fmtCurrency()      — Formatage devise (USD/CDF), NaN-safe
│   ├── statusColor()      — Couleur par statut inventaire
│   ├── statusLabel()      — Libellé FR du statut
│   ├── categoryLabel()    — Libellé FR de la catégorie
│   ├── categoryIcon()     — Icône Ionicons par catégorie
│   ├── movementLabel()    — Libellé FR du type mouvement
│   ├── movementIcon()     — Icône par type mouvement
│   ├── daysUntilExpiry()  — Jours avant expiration, null-safe
│   ├── relativeDate()     — Date relative en FR, null-safe
│   └── abcClassify()      — Classification ABC, zero-safe
│
├── InventoryScreen (export principal)
│   ├── État : loading, refreshing, products, allMovements, allAlerts, summary
│   ├── UI : activeTab, searchQuery, catalogFilter, sortField/Dir, expandedId
│   ├── Modales : showProductModal, showAdjustModal, showDeleteConfirm
│   ├── loadData() → DatabaseService bulk fetch + enrichissement
│   ├── filteredProducts (useMemo) → filtre + recherche + tri
│   ├── kpis (useMemo) → métriques calculées
│   └── Handlers : handleDeleteProduct, handleAlertAction
│
├── Composants enfants
│   ├── KPICard          — Carte KPI avec icône, valeur, libellé, hint
│   ├── CatalogContent   — Recherche + chips filtre + tri + liste produits
│   ├── ProductCard      — Carte produit expandable avec détails
│   ├── BatchesContent   — Lots groupés par urgence d'expiration
│   ├── MovementsContent — Mouvements groupés par date
│   ├── AlertsContent    — Alertes par sévérité avec actions
│   ├── Stat             — Cellule statistique réutilisable
│   ├── Threshold        — Pilule seuil (min/réappro/max)
│   └── EmptyState       — État vide avec icône et message
│
├── Modales
│   ├── ProductFormModal   — Formulaire CRUD complet
│   ├── StockAdjustModal   — Ajustement avec raison + preview
│   └── ConfirmDeleteModal — Confirmation de suppression
│
└── Formulaire
    ├── Field   — Champ texte avec label
    └── Select  — Sélecteur dropdown custom
```

### Flux de données

```
App Launch
  │
  ▼
loadData()
  │
  ├── getLicenseByKey('TRIAL-HK2024XY-Z9M3')
  ├── getOrganization(license.organizationId)
  │
  ▼ (parallel)
  ├── getProductsByOrganization(orgId)
  ├── getInventoryItemsByOrganization(orgId)
  ├── getInventorySummary(orgId)
  ├── getMovementsByOrganization(orgId, { limit: 100 })
  └── getActiveAlerts(orgId)
  │
  ▼ (enrichissement)
  Pour chaque produit :
    ├── Map vers InventoryItem (via productId)
    ├── getBatchesByInventoryItem(invItem.id)
    └── getStockMovements(invItem.id, { limit: 20 })
  │
  ▼
  abcClassify(enriched) → setProducts(...)
```

---

## 3. Modèle de données

### Product (40+ champs)

| Groupe | Champs clés |
|--------|------------|
| Identification | `name`, `genericName`, `sku`, `barcode`, `brandName` |
| Classification | `category` (11 types), `dosageForm` (17 types), `unitOfMeasure` (11 types) |
| Réglementation | `requiresPrescription`, `controlledSubstance`, `scheduleClass` |
| Tarification | `costPrice`, `sellingPrice`, `currency` (USD/CDF), `taxRate` |
| Seuils | `reorderLevel`, `minStockLevel`, `maxStockLevel`, `safetyStockDays` |
| Médical | `activeIngredients[]`, `strength`, `indication`, `storageConditions` |

### InventoryItem

| Champ | Description |
|-------|------------|
| `quantityOnHand` | Stock physique total |
| `quantityReserved` | Réservé (en cours de vente) |
| `quantityAvailable` | = onHand - reserved |
| `quantityOnOrder` | Commandes fournisseur en cours |
| `status` | `IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`, `OVER_STOCK`, `DISCONTINUED`, `QUARANTINED` |
| `totalStockValue` | = quantityOnHand × averageCost |
| `daysOfStockRemaining` | Jours avant rupture estimé |
| `shelfLocation` | Emplacement physique (ex: A-3-12) |

### InventoryBatch

| Champ | Description |
|-------|------------|
| `batchNumber` | Numéro de lot fabricant |
| `quantity` / `initialQuantity` | Quantité restante / initiale |
| `expiryDate` | Date d'expiration |
| `manufacturingDate` | Date de fabrication |
| `purchasePrice` | Prix d'achat du lot |
| `status` | `AVAILABLE`, `QUARANTINED`, `EXPIRED`, `DEPLETED`, `RECALLED` |

### StockMovement

| Champ | Description |
|-------|------------|
| `movementType` | 16 types (PURCHASE_RECEIPT, SALE, ADJUSTMENT_IN/OUT, EXPIRED, etc.) |
| `direction` | `IN` ou `OUT` |
| `quantity` | Quantité déplacée |
| `previousBalance` / `newBalance` | Balance avant/après |
| `unitCost` / `totalCost` | Coûts associés |
| `performedBy` | Utilisateur responsable |
| `reason` | Raison textuelle |

### InventoryAlert

| Champ | Description |
|-------|------------|
| `alertType` | `LOW_STOCK`, `OUT_OF_STOCK`, `EXPIRING_SOON`, `EXPIRED`, `OVER_STOCK`, `PRICE_CHANGE` |
| `severity` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `status` | `ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED` |
| `acknowledgedBy` / `resolvedBy` | Traçabilité |

---

## 4. Écran principal — Flux utilisateur

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  "Gestion d'Inventaire"                                      │
│  5 produits · Valeur totale: $X,XXX.XX                       │
│                          [⇕ Ajuster Stock]  [+ Nouveau]     │
├──────────────────────────────────────────────────────────────┤
│  KPI CARDS (6)                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ 📦 5 │ │ ⚠ 1  │ │ ❌ 0 │ │ ⏰ 2 │ │ 📈42%│ │ 🔔 3 │     │
│  │Total │ │Low   │ │Rupt. │ │Exp.  │ │Marge │ │Alert │     │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
├──────────────────────────────────────────────────────────────┤
│  ABC ANALYSIS BAR                                            │
│  ███████████████ A(2) ████████ B(1) ███ C(2)                │
│  🟢 A = 70% valeur  🟡 B = 20%  ⚪ C = 10%                 │
├──────────────────────────────────────────────────────────────┤
│  TABS                                                        │
│  [ Catalogue (5) | Lots (8) | Mouvements (12) | Alertes (3)]│
├──────────────────────────────────────────────────────────────┤
│  TAB CONTENT                                                 │
│  (voir sections dédiées ci-dessous)                          │
└──────────────────────────────────────────────────────────────┘
```

### Pull-to-refresh

L'écran prend en charge le **pull-to-refresh** via `RefreshControl`. L'ensemble des données est rechargé depuis `DatabaseService`.

---

## 5. KPI Dashboard

6 cartes métriques affichées en grille responsive :

| KPI | Source | Accent | Logique hint |
|-----|--------|--------|-------------|
| Total Produits | `products.length` | Primary (#122056) | — |
| Stock Bas | `summary.lowStockCount` | Warning (orange) | > 0 → "Attention", sinon "OK" |
| Ruptures | `summary.outOfStockCount` | Error (rouge) | > 0 → "Critique", sinon "Aucune" |
| Exp. < 90j | `summary.expiringBatchCount` | Violet (#8B5CF6) | — |
| Marge Moy. | Calculée (InventoryUtils.calculateMargin) | Vert (#10B981) | — |
| Alertes | `summary.activeAlerts` | Error si > 0, gris sinon | — |

---

## 6. Analyse ABC

### Algorithme

1. Calculer la `totalStockValue` de chaque produit
2. Trier par valeur décroissante
3. Cumuler le pourcentage :
   - **A** : 0–70% du cumul → Produits critiques (haute valeur)
   - **B** : 70–90% → Importants
   - **C** : 90–100% → Courants (faible valeur)

### Cas limites

| Scénario | Comportement |
|----------|-------------|
| 0 produits | Retourne `[]` |
| Toutes valeurs à 0 | Tous classés `C` |
| 1 seul produit | Classé `A` (100% de la valeur) |

### Visualisation

Barre segmentée horizontale avec `flex` proportionnel au nombre de produits par classe. Minimum `flex: 1` pour garantir la visibilité.

---

## 7. Catalogue (onglet)

### Recherche

Recherche instantanée sur 5 champs :
- Nom commercial (`name`)
- DCI / nom générique (`genericName`)
- SKU (`sku`)
- Code-barres (`barcode`)
- Fabricant (`manufacturer`)

### Filtres (chips)

| Filtre | Logique |
|--------|---------|
| Tous | Aucun filtre |
| Médicaments | `category === 'MEDICATION'` |
| OTC | `category === 'OTC'` |
| Consommables | `category === 'CONSUMABLE'` |
| ⚠ Stock Bas | `status === 'LOW_STOCK' \|\| status === 'OUT_OF_STOCK'` |
| ⏰ Exp. < 90j | Au moins 1 lot avec `0 < daysUntilExpiry ≤ 90` |

Chaque chip affiche son compteur en badge.

### Tri

5 critères avec direction asc/desc :

| Tri | Source |
|-----|--------|
| Nom | `name.localeCompare()` |
| Stock | `inventoryItem.quantityOnHand` |
| Valeur | `inventoryItem.totalStockValue` |
| Marge | `InventoryUtils.calculateMargin(cost, sell)` |
| Expiration | `Math.min(batches.map(daysUntilExpiry))` |

### ProductCard (expandable)

**Vue compacte :**
- Icône catégorie (colorée par statut)
- Nom + badge Rx + warning expiration + badge ABC
- Sous-titre : DCI · SKU · Dosage
- Pilule stock (quantité + couleur statut)
- Prix de vente

**Vue étendue (au clic) :**
- **Grille stats** : Statut, Disponible, Réservé, En commande, Coût unit., Marge, Emplacement, Jours restants, Classe ABC, Valeur stock
- **Seuils** : Min / Réappro / Max (pilules colorées)
- **Lots** : Numéro, quantité, barre de progression expiration, badge jours restants
- **Mouvements récents** (5 derniers) : Type, ±quantité, date relative
- **Métadonnées** : Catégorie · Forme · Fabricant · Conditions de stockage
- **Actions** : Ajuster / Modifier / Supprimer

### État vide

Si aucun produit trouvé :
- Si recherche active → "Modifiez votre recherche"
- Sinon → "Ajoutez des produits à l'inventaire"

---

## 8. Lots & Expiration (onglet)

### Regroupement

Tous les lots de tous les produits, triés par date d'expiration, répartis en 4 groupes :

| Groupe | Condition | Couleur | Icône |
|--------|-----------|---------|-------|
| 🔴 Expirés | `days ≤ 0` | Error | — |
| 🟠 Expire dans 30j | `0 < days ≤ 30` | Warning | — |
| 🟡 Expire dans 90j | `30 < days ≤ 90` | Violet | — |
| 🟢 Stock sûr | `days > 90` | Vert | — |

### Barre résumé

4 cartes en ligne avec bordure gauche colorée, affichant le compteur de chaque groupe.

### État vide

"Aucun lot enregistré" → "Les lots apparaîtront ici après réception de stock"

---

## 9. Mouvements (onglet)

### Regroupement par date

Les mouvements sont groupés par jour (format FR : "02 juin 2025").

### Carte mouvement

| Élément | Contenu |
|---------|---------|
| Icône | Par type, colorée IN=vert / OUT=rouge |
| Titre | Label FR du type |
| Produit | Résolu via `prodMap` (productId + inventoryItemId) |
| Raison | Si présente, en italique |
| Quantité | ±N coloré |
| Balance | `previousBalance → newBalance` |

### 16 types de mouvements supportés

`PURCHASE_RECEIPT`, `SALE`, `PRESCRIPTION`, `TRANSFER_IN`, `TRANSFER_OUT`,
`RETURN_TO_SUPPLIER`, `CUSTOMER_RETURN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`,
`DAMAGED`, `EXPIRED`, `DISPOSAL`, `DONATION`, `INITIAL_STOCK`, `SAMPLE`, `RECALL`

### État vide

"Aucun mouvement" → "Les mouvements de stock apparaîtront ici"

---

## 10. Alertes (onglet)

### Sévérité

| Sévérité | Couleur |
|----------|---------|
| CRITICAL | Error (rouge) |
| HIGH | Warning (orange) |
| MEDIUM | Violet (#8B5CF6) |
| LOW | Info (bleu) |

### Types d'alertes

`LOW_STOCK`, `EXPIRING_SOON`, `OUT_OF_STOCK`, `EXPIRED`, `OVER_STOCK`, `PRICE_CHANGE`

### Actions

| Action | Effet |
|--------|-------|
| **Acquitter** | Marque `status: ACKNOWLEDGED`, `acknowledgedBy: admin` |
| **Résoudre** | Marque `status: RESOLVED`, `resolvedBy: admin`, `resolvedReason: 'Résolu manuellement'` |

### État vide

"Aucune alerte active" → "Votre inventaire est en bon état" ✅

---

## 11. CRUD Produit — Formulaire

### Sections du formulaire

| Section | Champs |
|---------|--------|
| **Identification** | Nom commercial*, DCI, SKU* (auto-généré), Code-barres |
| **Classification** | Catégorie (11), Forme (17), Dosage, Unité (11), Fabricant, Taille pack |
| **Réglementation** | ☑ Ordonnance requise, ☑ Substance contrôlée |
| **Tarification** | Prix d'achat*, Prix de vente*, TVA % + preview marge |
| **Niveaux stock** | Stock minimum, Seuil réappro, Stock maximum |
| **Informations** | Indication thérapeutique (multiline) |

`*` = champs obligatoires

### Validations

| Règle | Message |
|-------|---------|
| Nom vide | "Le nom du produit est requis" |
| Prix NaN ou négatif | "Prix d'achat et prix de vente doivent être des nombres valides" |
| Prix = 0 | "Prix d'achat et prix de vente doivent être supérieurs à 0" |
| Vente < Coût | "Le prix de vente ne peut pas être inférieur au prix d'achat" |
| min > reorder ou reorder > max | "Niveaux de stock incohérents: min ≤ réappro ≤ max" |
| Licence/Org introuvable | Toast error + retour propre (setSaving(false)) |

### Flux création

```
handleSave()
  ├── Validations (5 checks)
  ├── setSaving(true)
  ├── DatabaseService.createProduct({...})
  ├── DatabaseService.createInventoryItem({
  │     quantityOnHand: 0,
  │     status: 'OUT_OF_STOCK',
  │     averageCost: costPrice,
  │     ...
  │   })
  ├── toast.success("X ajouté à l'inventaire")
  ├── onSaved() → ferme modal + loadData()
  └── setSaving(false)
```

### Flux mise à jour

```
handleSave()
  ├── Validations (5 checks)
  ├── setSaving(true)
  ├── DatabaseService.updateProduct(id, {...})
  ├── toast.success("X mis à jour")
  ├── onSaved() → ferme modal + loadData()
  └── setSaving(false)
```

### SKU auto-généré

Pour les nouveaux produits : `MED-${Date.now().toString(36).toUpperCase()}`  
Exemple : `MED-M5K3J2L`

---

## 12. Ajustement de Stock

### Interface

```
┌────────────────────────────────────┐
│  Ajustement de Stock          [✕]  │
├────────────────────────────────────┤
│  Produit : [chip selector]         │
│                                    │
│  Stock actuel :              120   │
│                                    │
│  [+ Ajouter]    [- Retirer]        │
│                                    │
│  Quantité : [_____]               │
│                                    │
│  ⚠ Le retrait dépasse le stock    │  ← si applicable
│                                    │
│  Nouveau stock :              85   │
│                                    │
│  ℹ Ce niveau dépassera le max     │  ← si applicable
│                                    │
│  Raison * :                        │
│  [Comptage physique] [Réception]   │
│  [Produit endommagé] [Expiré]     │
│  [Retour client] [Correction]     │
│  [Don / Échantillon] [Autre]      │
│                                    │
│        [Annuler]  [Confirmer]      │
└────────────────────────────────────┘
```

### Flux

```
handleSave()
  ├── Validations (qty > 0, raison non vide, inventaire existe)
  ├── ⚠ Warning si retrait > stock actuel (plafonné à 0)
  ├── setSaving(true)
  ├── DatabaseService.updateInventoryItem(inv.id, {
  │     quantityOnHand: newQty,
  │     quantityAvailable: max(0, newQty - reserved),
  │     totalStockValue: newQty × averageCost,
  │     status: computed (OUT_OF_STOCK / LOW_STOCK / IN_STOCK / OVER_STOCK)
  │   })
  ├── DatabaseService.createStockMovement({
  │     movementType: ADJUSTMENT_IN / ADJUSTMENT_OUT,
  │     direction: IN / OUT,
  │     quantity, previousBalance, newBalance,
  │     performedBy: 'admin',
  │     reason: adjReason
  │   })
  ├── toast.success("Stock ajusté: X (120 → 85)")
  ├── onSaved() → ferme modal + loadData()
  └── setSaving(false)
```

### 8 raisons prédéfinies

1. Comptage physique
2. Réception livraison
3. Produit endommagé
4. Produit expiré
5. Retour client
6. Correction d'erreur
7. Don / Échantillon
8. Autre

### Détection de statut

| Condition | Statut résultant |
|-----------|-----------------|
| `newQty === 0` | `OUT_OF_STOCK` |
| `newQty ≤ minStockLevel` | `LOW_STOCK` |
| `newQty ≥ maxStockLevel` | `OVER_STOCK` |
| Autre | `IN_STOCK` |

### Réinitialisation

Lorsque l'utilisateur change de produit dans le sélecteur, les champs quantité, raison et direction sont automatiquement réinitialisés.

---

## 13. Suppression de Produit

### Flux

```
1. Clic "Supprimer" sur ProductCard
2. ConfirmDeleteModal affiché
   "« Amoxicilline 500mg » sera supprimé définitivement.
    Cette action est irréversible."
3. Si le produit a du stock > 0 :
   → toast.warning("Attention: X unités en stock seront perdues")
4. DatabaseService.deleteProduct(id)
5. Collapse la carte étendue (expandedId = null)
6. toast.success("X supprimé")
7. loadData() pour rafraîchir
```

---

## 14. Cas limites gérés

| # | Cas limite | Solution |
|---|-----------|----------|
| 1 | `fmtCurrency` reçoit `null`/`undefined`/`NaN` | `Number(amount) \|\| 0` |
| 2 | `daysUntilExpiry` avec date invalide/null | Retourne `9999` (= "sûr") |
| 3 | `relativeDate` avec date invalide/null | Retourne "—" |
| 4 | `relativeDate` avec date future | Retourne "À venir" |
| 5 | ABC avec 0 produits | Retourne `[]` |
| 6 | ABC avec toutes valeurs = 0 | Tous classés `C` |
| 7 | Bouton "Ajuster Stock" avec 0 produits | Désactivé + toast warning |
| 8 | Prix `"0"` en string (truthy mais invalide) | `parseFloat() > 0` check |
| 9 | Prix de vente < prix d'achat | Validation + toast warning |
| 10 | Niveaux stock incohérents (min > max) | Validation `min ≤ reorder ≤ max` |
| 11 | `setSaving(false)` oublié en early return | Ajouté dans tous les chemins |
| 12 | Retrait > stock actuel | Warning toast + plafonné à 0 |
| 13 | `quantityAvailable` négatif | `Math.max(0, newQty - reserved)` |
| 14 | Suppression produit avec stock > 0 | Warning toast informatif |
| 15 | Carte étendue après suppression | `expandedId` reset à `null` |
| 16 | `OVER_STOCK` non détecté | Ajouté dans la logique de statut |
| 17 | Onglet Lots vide | EmptyState "Aucun lot enregistré" |
| 18 | Mouvements sans produit résolu | Fallback "Produit inconnu" + double mapping (productId + inventoryItemId) |
| 19 | Bouton "Confirmer" ajustement : double-clic | Désactivé pendant `saving` + spinner |
| 20 | Changement de produit dans adjust modal | Reset qty/raison/direction |

---

## 15. Intégration POS

Le module POS (Point of Sale) interagit avec l'inventaire via :

### Lors d'une vente (processSale)

```
POSScreen → DatabaseService.processSale()
  ├── Crée le Sale + SaleItems
  ├── Pour chaque article vendu :
  │   ├── updateInventoryItem (quantityOnHand -= qty)
  │   └── createStockMovement (type: 'SALE', direction: 'OUT')
  └── Recalcule statut (LOW_STOCK si < reorderLevel)
```

### Impact visible

Après une vente POS :
- Les **KPIs** se mettent à jour au prochain `loadData()`
- Les **mouvements** apparaissent dans l'onglet Mouvements
- Les **alertes** LOW_STOCK/OUT_OF_STOCK sont créées automatiquement
- Le **statut** du produit dans le Catalogue change de couleur

---

## 16. Roadmap

### Phase actuelle ✅

- [x] Dashboard KPI complet
- [x] Analyse ABC automatique
- [x] Catalogue avec recherche/filtre/tri
- [x] ProductCard expandable
- [x] CRUD Produit avec validations complètes
- [x] Ajustement de stock avec traçabilité
- [x] Lots & Expiration groupés
- [x] Mouvements avec historique
- [x] Alertes avec acquittement/résolution
- [x] 20 cas limites gérés

### Phase suivante (planifiée)

- [ ] Bons de commande fournisseur (PurchaseOrder CRUD)
- [ ] Scan code-barres (caméra mobile)
- [ ] Export PDF/Excel des rapports
- [ ] Inventaire physique (comptage avec écarts)
- [ ] Gestion multi-entrepôts
- [ ] Alertes push pour expirations
- [ ] Tableau de bord analytique (graphiques tendances)
- [ ] Intégration prix CDF (taux de change)

---

*Document généré pour le projet HK Management Systems — Module Pharmacie (DRC/Congo)*
