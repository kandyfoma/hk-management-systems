# Audit Logging System - Guide d'utilisation

Système complet d'audit pour le suivi de toutes les activités utilisateur dans le système de gestion de pharmacie.

## Fonctionnalités

### 🔍 Logging Automatique
- **Modifications de modèles**: Tous les CREATE/UPDATE/DELETE sont automatiquement enregistrés
- **Authentification**: Connexions/déconnexions et tentatives échouées
- **Requêtes sensibles**: Accès aux API et pages critiques
- **Opérations pharmacie**: Actions spécialisées (dispensation, ventes, inventaire)

### 📊 Types d'Actions Trackées
- `LOGIN/LOGOUT` - Authentification
- `CREATE/UPDATE/DELETE` - Modifications de données
- `DISPENSE` - Dispensation d'ordonnances
- `SALE/REFUND/VOID` - Opérations de vente
- `STOCK_ADJUSTMENT` - Modifications d'inventaire
- `PRESCRIPTION_*` - Actions sur ordonnances
- `EXPORT/IMPORT` - Exports/imports de données

### 🎯 Niveaux de Sévérité
- `LOW` - Actions normales (consultation)
- `MEDIUM` - Actions importantes (ventes, modifications)
- `HIGH` - Actions critiques (dispensation, remboursements)
- `CRITICAL` - Actions ultra-sensibles (utilisateurs, permissions)

## Architecture

### Modèles Principaux
- **AuditLog**: Journal principal avec contexte complet
- **PharmacyAuditLog**: Extensions spécialisées pharmacie
- **AuditLogSummary**: Résumés quotidiens pour reporting

### Composants
- **Signaux Django**: Capture automatique des modifications
- **Middleware**: Contexte des requêtes HTTP
- **Décorateurs**: Audit d'actions spécifiques
- **Management Commands**: Maintenance et résumés

## Usage

### 1. Décorateurs pour Actions Spécifiques

```python
from apps.audit.decorators import audit_dispense, audit_sale, audit_critical_action

@audit_dispense(description="Dispensation ordonnance #123")
def dispense_prescription(request, prescription_id):
    # Logique de dispensation
    pass

@audit_critical_action(description="Annulation vente")
def void_sale(request, sale_id):
    # Logique d'annulation
    pass
```

### 2. Logging Manuel

```python
from apps.audit.utils import log_pharmacy_action
from apps.audit.models import AuditActionType, AuditSeverity

log_pharmacy_action(
    user=request.user,
    action=AuditActionType.STOCK_ADJUSTMENT,
    description="Ajustement manuel stock produit ABC123",
    severity=AuditSeverity.MEDIUM,
    product_sku="ABC123",
    quantity=50
)
```

### 3. Context Manager pour Opérations Complexes

```python
from apps.audit.decorators import AuditContextManager
from apps.audit.models import AuditActionType

with AuditContextManager(
    user=request.user,
    action_type=AuditActionType.INVENTORY_COUNT,
    description="Comptage inventaire complet"
) as audit_ctx:
    # Opération complexe
    for item in inventory_items:
        process_item(item)
        audit_ctx.add_context(processed_items=processed_count)
```

## APIs Disponibles

### Consultation des Logs
- `GET /api/v1/audit/logs/` - Liste des logs d'audit
- `GET /api/v1/audit/logs/{id}/` - Détail d'un log
- `POST /api/v1/audit/logs/search/` - Recherche avancée
- `GET /api/v1/audit/logs/my/` - Mes activités

### Audit Pharmacie
- `GET /api/v1/audit/pharmacy/` - Logs pharmacie spécialisés
- `POST /api/v1/audit/pharmacy/verify/` - Marquer comme vérifié

### Analytics
- `GET /api/v1/audit/analytics/` - Statistiques générales
- `GET /api/v1/audit/analytics/pharmacy/` - Analytics pharmacie

### Export
- `GET /api/v1/audit/logs/export/` - Export CSV (admin seulement)

## Commands de Management

### Génération de Résumés Quotidiens
```bash
# Résumé pour hier (par défaut)
python manage.py generate_audit_summary

# Résumé pour une date spécifique
python manage.py generate_audit_summary --date 2024-01-15

# Pour une organisation spécifique
python manage.py generate_audit_summary --organization 1
```

### Nettoyage des Logs Anciens
```bash
# Garder 365 jours (par défaut)
python manage.py audit_cleanup

# Garder 90 jours
python manage.py audit_cleanup --days 90

# Préserver les logs critiques
python manage.py audit_cleanup --keep-critical

# Simulation (dry run)
python manage.py audit_cleanup --dry-run
```

## Configuration

### Settings Django
```python
INSTALLED_APPS = [
    # ...
    'apps.audit',
]

MIDDLEWARE = [
    # ...
    'apps.audit.utils.AuditMiddleware',
    # ...
]
```

Ce système d'audit complet assure une traçabilité totale et une conformité réglementaire pour toutes les opérations de votre système de gestion de pharmacie.