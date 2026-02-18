"""
Management command: load_occ_protocols

Loads the baseline occupational health protocol data (sectors, departments,
positions, exam catalog, and visit protocols) into the database.

Safe to run multiple times — uses get_or_create throughout.

Usage:
    python manage.py load_occ_protocols
    python manage.py load_occ_protocols --clear   # wipe existing data first (dev only)
"""
from django.core.management.base import BaseCommand
from django.db import transaction


EXAM_CATALOG = [
    # Biologie
    {"code": "NFS",            "label": "Numération Formule Sanguine",         "category": "biologie"},
    {"code": "GLYCEMIE",       "label": "Glycémie à jeun",                     "category": "biologie"},
    {"code": "BILAN_LIPIDIQUE","label": "Bilan lipidique complet",             "category": "biologie"},
    {"code": "CREATININE",     "label": "Créatinine & fonction rénale",        "category": "biologie"},
    {"code": "BILAN_HEPATIQUE","label": "Bilan hépatique (ALAT, ASAT, GGT)",  "category": "biologie"},
    {"code": "ACIDE_URIQUE",   "label": "Acide urique",                        "category": "biologie"},
    {"code": "IONOGRAMME",     "label": "Ionogramme sanguin",                  "category": "biologie"},
    # Toxicologie
    {"code": "PLOMBEMIE",      "label": "Plombémie (dosage plomb sanguin)",    "category": "toxicologie"},
    {"code": "MERCURE_U",      "label": "Mercurie urinaire",                   "category": "toxicologie"},
    {"code": "CHOLINESTERASE", "label": "Cholinestérase (pesticides)",         "category": "toxicologie"},
    {"code": "SOLVANTS_U",     "label": "Solvants urinaires",                  "category": "toxicologie"},
    {"code": "METAUX_URINES",  "label": "Métaux lourds urinaires",             "category": "toxicologie"},
    # Imagerie
    {"code": "RADIO_THORAX",   "label": "Radiographie thoracique",             "category": "imagerie"},
    {"code": "ECHO_ABDO",      "label": "Échographie abdominale",              "category": "imagerie"},
    # Audiologie
    {"code": "AUDIOMETRIE",    "label": "Audiométrie tonale",                  "category": "audiologie"},
    # Pneumologie
    {"code": "EFR",            "label": "Épreuves fonctionnelles respiratoires","category": "pneumologie"},
    # Ophtalmologie
    {"code": "VISION",         "label": "Acuité visuelle & vision couleurs",   "category": "ophtalmologie"},
    # Cardiologie
    {"code": "ECG",            "label": "Électrocardiogramme de repos",        "category": "cardiologie"},
    {"code": "TEST_EFFORT",    "label": "Test d'effort cardiovasculaire",      "category": "cardiologie",
     "requires_specialist": True},
    # Neurologie
    {"code": "EMG",            "label": "Électromyogramme (TMS)",              "category": "neurologie",
     "requires_specialist": True},
    # Psychologie
    {"code": "PSYCHO_TEST",    "label": "Tests psychotechniques",              "category": "psychologie"},
    # Aptitude / clinique
    {"code": "EXAM_CLINIQUE",  "label": "Examen clinique général",             "category": "aptitude"},
    {"code": "IMC",            "label": "IMC & mesures anthropométriques",     "category": "aptitude"},
    {"code": "TA_POULS",       "label": "Tension artérielle & pouls",          "category": "aptitude"},
    {"code": "ALCOOTEST",      "label": "Alcootest / éthylomètre",             "category": "aptitude"},
    # Vaccins
    {"code": "VACCIN_HBV",     "label": "Sérologie hépatite B (HBsAg, Ac)",   "category": "vaccination"},
    {"code": "VACCIN_TETANOS", "label": "Statut vaccinal tétanos",             "category": "vaccination"},
    # Dermatologie
    {"code": "EXAMEN_PEAU",    "label": "Examen dermatologique",              "category": "dermatologie"},
    # Ergonomie
    {"code": "ERGO_TMS",       "label": "Évaluation ergonomique TMS",          "category": "ergonomie"},
]


# -----------------------------------------------------------------------
# Sector → Department → Position → [required_exams, recommended_exams]
# keyed by visit_type
# -----------------------------------------------------------------------
SECTORS_DATA = [
    {
        "code": "MIN",
        "name": "Secteur Minier",
        "industry_sector_key": "mining",
        "departments": [
            {
                "code": "EXPLOIT",
                "name": "Exploitation Minière",
                "positions": [
                    {
                        "code": "FOREUR",
                        "name": "Foreur / Opérateur de foreuse",
                        "typical_exposures": ["silice_cristalline", "bruit", "vibrations"],
                        "recommended_ppe": ["masque_ffp3", "protections_auditives", "gants_anti_vibration"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "NFS", "RADIO_THORAX", "EFR", "AUDIOMETRIE", "VISION", "ECG"],
                                "recommended": ["BILAN_HEPATIQUE", "IMC"],
                                "validity_months": 12,
                                "regulatory_note": "Contrôle silicose obligatoire avant affectation (Code minier Art. 142)",
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "EFR", "AUDIOMETRIE", "RADIO_THORAX"],
                                "recommended": ["NFS", "GLYCEMIE"],
                                "validity_months": 12,
                            },
                            "return_to_work": {
                                "required": ["EXAM_CLINIQUE", "EFR"],
                                "recommended": ["RADIO_THORAX"],
                                "validity_months": 3,
                            },
                        },
                    },
                    {
                        "code": "ABATTEUR",
                        "name": "Abatteur / Mineur de fond",
                        "typical_exposures": ["silice_cristalline", "bruit", "eclairage_insuffisant"],
                        "recommended_ppe": ["masque_ffp3", "protections_auditives", "lampe_frontale"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "NFS", "RADIO_THORAX", "EFR", "AUDIOMETRIE", "VISION"],
                                "recommended": ["ECG", "IMC"],
                                "validity_months": 12,
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "EFR", "AUDIOMETRIE"],
                                "recommended": ["RADIO_THORAX"],
                                "validity_months": 12,
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        "code": "TEL",
        "name": "Secteur Télécommunications",
        "industry_sector_key": "telecommunications",
        "departments": [
            {
                "code": "INFRA_TEL",
                "name": "Infrastructure & Antennes",
                "positions": [
                    {
                        "code": "TECH_ANTENNE",
                        "name": "Technicien antenne / Grimpeur",
                        "typical_exposures": ["travail_hauteur", "champs_electromagnetiques"],
                        "recommended_ppe": ["harnais", "casque", "gants_isolants"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "VISION", "TEST_EFFORT", "ECG", "PSYCHO_TEST"],
                                "recommended": ["TA_POULS", "NFS"],
                                "validity_months": 12,
                                "regulatory_note": "Aptitude au travail en hauteur obligatoire",
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "VISION", "ECG", "PSYCHO_TEST"],
                                "recommended": [],
                                "validity_months": 12,
                            },
                        },
                    },
                ],
            },
            {
                "code": "IT_TEL",
                "name": "Informatique & Systèmes",
                "positions": [
                    {
                        "code": "DEV_SW",
                        "name": "Développeur / Analyste",
                        "typical_exposures": ["ecran", "posture_sedentaire"],
                        "recommended_ppe": ["filtres_ecran"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "VISION", "ERGO_TMS"],
                                "recommended": ["IMC", "TA_POULS"],
                                "validity_months": 24,
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "VISION"],
                                "recommended": ["ERGO_TMS"],
                                "validity_months": 24,
                            },
                        },
                    },
                ],
            },
        ],
    },
    {
        "code": "BAN",
        "name": "Secteur Bancaire & Financier",
        "industry_sector_key": "finance",
        "departments": [
            {
                "code": "AGC_BAN",
                "name": "Agences & Guichets",
                "positions": [
                    {
                        "code": "CAISSIER",
                        "name": "Caissier / Agent de guichet",
                        "typical_exposures": ["stress", "ecran", "billets_contamine"],
                        "recommended_ppe": ["gel_hydroalcoolique"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "VISION", "TA_POULS"],
                                "recommended": ["PSYCHO_TEST", "IMC"],
                                "validity_months": 24,
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "VISION", "TA_POULS"],
                                "recommended": ["GLYCEMIE", "BILAN_LIPIDIQUE"],
                                "validity_months": 24,
                            },
                        },
                    },
                ],
            },
            {
                "code": "SI_BAN",
                "name": "Systèmes d'information",
                "positions": [
                    {
                        "code": "ADMIN_SYS",
                        "name": "Administrateur systèmes / DBA",
                        "typical_exposures": ["ecran", "astreintes_nuit"],
                        "recommended_ppe": ["filtres_ecran"],
                        "protocols": {
                            "pre_employment": {
                                "required": ["EXAM_CLINIQUE", "VISION", "ERGO_TMS"],
                                "recommended": ["TA_POULS", "PSYCHO_TEST"],
                                "validity_months": 24,
                            },
                            "periodic": {
                                "required": ["EXAM_CLINIQUE", "VISION"],
                                "recommended": ["ERGO_TMS", "TA_POULS"],
                                "validity_months": 24,
                            },
                        },
                    },
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Load baseline occupational health protocol data (idempotent)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            dest='clear',
            help='Delete all existing protocol data before loading (dev only)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.occupational_health.models import (
            MedicalExamCatalog, OccSector, OccDepartment, OccPosition,
            ExamVisitProtocol, ProtocolRequiredExam,
        )

        if options['clear']:
            self.stdout.write(self.style.WARNING("Clearing existing protocol data..."))
            ProtocolRequiredExam.objects.all().delete()
            ExamVisitProtocol.objects.all().delete()
            OccPosition.objects.all().delete()
            OccDepartment.objects.all().delete()
            OccSector.objects.all().delete()
            MedicalExamCatalog.objects.all().delete()

        # ── 1. Exam catalog ─────────────────────────────────────────────
        self.stdout.write("Loading exam catalog...")
        exam_map = {}  # code → MedicalExamCatalog instance
        for entry in EXAM_CATALOG:
            obj, created = MedicalExamCatalog.objects.get_or_create(
                code=entry["code"],
                defaults={
                    "label": entry["label"],
                    "category": entry["category"],
                    "requires_specialist": entry.get("requires_specialist", False),
                    "is_active": True,
                },
            )
            if not created:
                # keep label + category up to date
                obj.label = entry["label"]
                obj.category = entry["category"]
                obj.save(update_fields=["label", "category"])
            exam_map[obj.code] = obj
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(exam_map)} exam types loaded"))

        # ── 2. Sectors → Departments → Positions → Protocols ────────────
        for s_data in SECTORS_DATA:
            sector, _ = OccSector.objects.get_or_create(
                code=s_data["code"],
                defaults={
                    "name": s_data["name"],
                    "industry_sector_key": s_data["industry_sector_key"],
                    "is_active": True,
                },
            )
            self.stdout.write(f"\nSector: {sector.code} — {sector.name}")

            for d_data in s_data.get("departments", []):
                dept, _ = OccDepartment.objects.get_or_create(
                    sector=sector,
                    code=d_data["code"],
                    defaults={"name": d_data["name"], "is_active": True},
                )
                self.stdout.write(f"  Dept: {dept.code}")

                for p_data in d_data.get("positions", []):
                    pos, _ = OccPosition.objects.get_or_create(
                        department=dept,
                        code=p_data["code"],
                        defaults={
                            "name": p_data["name"],
                            "typical_exposures": p_data.get("typical_exposures", []),
                            "recommended_ppe": p_data.get("recommended_ppe", []),
                            "is_active": True,
                        },
                    )
                    self.stdout.write(f"    Position: {pos.code}")

                    for visit_type, proto_data in p_data.get("protocols", {}).items():
                        protocol, created = ExamVisitProtocol.objects.get_or_create(
                            position=pos,
                            visit_type=visit_type,
                            defaults={
                                "validity_months": proto_data.get("validity_months", 12),
                                "regulatory_note": proto_data.get("regulatory_note", ""),
                                "is_active": True,
                            },
                        )

                        if created:
                            # Required exams
                            for order, code in enumerate(proto_data.get("required", []), 1):
                                exam = exam_map.get(code)
                                if exam:
                                    ProtocolRequiredExam.objects.get_or_create(
                                        protocol=protocol,
                                        exam=exam,
                                        defaults={"order": order, "is_blocking": True},
                                    )
                                else:
                                    self.stdout.write(
                                        self.style.WARNING(f"      ⚠ Unknown exam code: {code}")
                                    )
                            # Recommended exams
                            rec_exams = [
                                exam_map[c] for c in proto_data.get("recommended", [])
                                if c in exam_map
                            ]
                            if rec_exams:
                                protocol.recommended_exams.set(rec_exams)

                            self.stdout.write(
                                f"      Protocol {visit_type}: "
                                f"{len(proto_data.get('required', []))} required, "
                                f"{len(proto_data.get('recommended', []))} recommended"
                            )

        self.stdout.write(self.style.SUCCESS("\n✅ Protocol data loaded successfully."))
        self.stdout.write("   Sectors:   " + str(OccSector.objects.count()))
        self.stdout.write("   Depts:     " + str(OccDepartment.objects.count()))
        self.stdout.write("   Positions: " + str(OccPosition.objects.count()))
        self.stdout.write("   Protocols: " + str(ExamVisitProtocol.objects.count()))
        self.stdout.write("   Req. exam entries: " + str(ProtocolRequiredExam.objects.count()))
