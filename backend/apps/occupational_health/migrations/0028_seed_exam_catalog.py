"""
Data migration: Seed MedicalExamCatalog with standard occupational health exams.

These are the core tests referenced throughout the frontend's consultation
workflow and sector protocols. Without these entries the catalog would be
empty and no test cards would appear in the consultation test step.
"""
from django.db import migrations


STANDARD_EXAMS = [
    # ── Audiometry ────────────────────────────────────────────────────────────
    {
        'code': 'AUDIOGRAMME',
        'label': 'Audiométrie',
        'category': 'fonctionnel',
        'description': 'Audiogramme tonal — seuils auditifs OG et OD (500 Hz–8 kHz). '
                       'Surveillance annuelle obligatoire pour les travailleurs exposés au bruit.',
        'requires_specialist': False,
    },
    # ── Spirometry ────────────────────────────────────────────────────────────
    {
        'code': 'SPIROMETRIE',
        'label': 'Spirométrie',
        'category': 'fonctionnel',
        'description': 'Exploration fonctionnelle respiratoire (CVF, VEMS, VEMS/CVF). '
                       'Surveillance annuelle pour les travailleurs exposés aux poussières, '
                       'fumées et agents respiratoires.',
        'requires_specialist': False,
    },
    # ── Vision ────────────────────────────────────────────────────────────────
    {
        'code': 'TEST_VISION_COMPLETE',
        'label': 'Examen de Vision Complet',
        'category': 'ophtalmologie',
        'description': "Acuité visuelle de loin et de près, vision des couleurs, champ visuel. "
                       "Obligatoire pour conducteurs, opérateurs d'engins et travailleurs sur écran.",
        'requires_specialist': False,
    },
    {
        'code': 'TEST_VISION_NOCTURNE',
        'label': 'Vision Nocturne',
        'category': 'ophtalmologie',
        'description': "Évaluation de la vision en conditions de faible luminosité. "
                       "Recommandé pour les conducteurs et le personnel de sécurité.",
        'requires_specialist': False,
    },
    # ── Radiology ─────────────────────────────────────────────────────────────
    {
        'code': 'RADIO_THORAX',
        'label': 'Radiographie Thoracique',
        'category': 'imagerie',
        'description': "Radiographie standard F+P — dépistage pneumoconioses (classification ILO), "
                       "tuberculose et pathologies cardiovasculaires. Tous les 2 ans pour "
                       "secteurs minier, carrière et construction.",
        'requires_specialist': True,
    },
    # ── Cardiology ────────────────────────────────────────────────────────────
    {
        'code': 'ECG_REPOS',
        'label': 'ECG de Repos (12 dérivations)',
        'category': 'cardiologique',
        'description': "Électrocardiogramme de repos. Dépistage des arythmies et cardiopathies. "
                       "Obligatoire pour travailleurs en hauteur, conducteurs, et après 40 ans.",
        'requires_specialist': False,
    },
    {
        'code': 'TEST_EFFORT',
        'label': "Épreuve d'Effort",
        'category': 'cardiologique',
        'description': "ECG d'effort sur ergocycle ou tapis roulant. Évaluation capacité cardiaque "
                       "pour travaux physiques intenses.",
        'requires_specialist': True,
    },
    # ── Biology — heavy metals ────────────────────────────────────────────────
    {
        'code': 'PLOMBEMIE',
        'label': 'Plombémie (Plomb sanguin)',
        'category': 'biologique',
        'description': "Dosage du plomb dans le sang. Surveillance biologique obligatoire pour "
                       "travailleurs exposés au plomb (Pb). Fréquence semestrielle si >Valeur Limite.",
        'requires_specialist': False,
    },
    {
        'code': 'COBALTEMIE',
        'label': 'Cobaltémie',
        'category': 'biologique',
        'description': "Dosage du cobalt sanguin — surveillance biologiques des travailleurs "
                       "exposés (outils carbure, ciment, pigments).",
        'requires_specialist': False,
    },
    # ── Biology — general ────────────────────────────────────────────────────
    {
        'code': 'NFS',
        'label': 'Numération Formule Sanguine (NFS)',
        'category': 'biologique',
        'description': "Hémogramme complet : globules rouges, leucocytes, plaquettes, hémoglobine. "
                       "Dépistage anémie, infections, syndromes toxiques.",
        'requires_specialist': False,
    },
    {
        'code': 'BILAN_HEPATIQUE',
        'label': 'Bilan Hépatique',
        'category': 'biologique',
        'description': "Transaminases (ALAT/ASAT), gamma-GT, bilirubine, phosphatases alcalines. "
                       "Surveillance hépatotoxicité pour expositions aux solvants et produits chimiques.",
        'requires_specialist': False,
    },
    # ── Toxicology ────────────────────────────────────────────────────────────
    {
        'code': 'TEST_ALCOOL_DROGUE',
        'label': 'Dépistage Alcool & Substances',
        'category': 'toxicologie',
        'description': "Alcootest urinaire/sanguin et recherche de substances psychoactives. "
                       "Obligatoire pour postes de sécurité, conducteurs et travailleurs en hauteur.",
        'requires_specialist': False,
    },
    # ── Mental / psychosocial ─────────────────────────────────────────────────
    {
        'code': 'EVALUATION_STRESS',
        'label': 'Évaluation Risques Psychosociaux',
        'category': 'psychosocial',
        'description': "Questionnaire validé (Karasek, Maslach) — dépistage burn-out, stress au "
                       "travail, harcèlement.",
        'requires_specialist': False,
    },
    {
        'code': 'EVALUATION_PSYCHOTECHNIQUE',
        'label': 'Bilan Psychotechnique',
        'category': 'psychotechnique',
        'description': "Tests d'aptitude cognitive (temps de réaction, attention, coordination) "
                       "pour postes à risque élevé (conducteurs, opérateurs machines).",
        'requires_specialist': True,
    },
    # ── Hepatitis screening ───────────────────────────────────────────────────
    {
        'code': 'HEPATITE_B',
        'label': 'Dépistage Hépatite B (HBs Ag)',
        'category': 'biologique',
        'description': "AgHBs + Anti-HBs. Statut vaccinal et exposition professionnelle au VHB "
                       "(travailleurs de santé, traitement des eaux). Vaccin systématique si négatif.",
        'requires_specialist': False,
    },
    # ── TB screening ─────────────────────────────────────────────────────────
    {
        'code': 'DEPISTAGE_TB',
        'label': 'Dépistage Tuberculose (IDR / IGRA)',
        'category': 'clinique',
        'description': "Intradermoréaction à la tuberculine (IDR) ou test IGRA (Quantiféron). "
                       "Recommandé en secteur minier, soins de santé et milieu confiné.",
        'requires_specialist': False,
    },
    # ── Health screening ─────────────────────────────────────────────────────
    {
        'code': 'QUESTIONNAIRE_SANTE',
        'label': 'Dépistage Santé Général',
        'category': 'clinique',
        'description': "Questionnaire de santé général — antécédents, mode de vie, plaintes actuelles. "
                       "Inclus dans toute visite médicale périodique.",
        'requires_specialist': False,
    },
]


def seed_exam_catalog(apps, schema_editor):
    MedicalExamCatalog = apps.get_model('occupational_health', 'MedicalExamCatalog')
    created = 0
    for exam in STANDARD_EXAMS:
        obj, was_created = MedicalExamCatalog.objects.get_or_create(
            code=exam['code'],
            defaults={
                'label': exam['label'],
                'category': exam['category'],
                'description': exam['description'],
                'requires_specialist': exam['requires_specialist'],
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    print(f'\n  ✓ MedicalExamCatalog: {created} entries created, {len(STANDARD_EXAMS) - created} already existed.')


def remove_seeded_exams(apps, schema_editor):
    """Reverse: remove entries that were seeded by this migration (only if they still match)."""
    MedicalExamCatalog = apps.get_model('occupational_health', 'MedicalExamCatalog')
    codes = [e['code'] for e in STANDARD_EXAMS]
    MedicalExamCatalog.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('occupational_health', '0027_overexposurealert_is_auto_generated_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_exam_catalog, remove_seeded_exams),
    ]
