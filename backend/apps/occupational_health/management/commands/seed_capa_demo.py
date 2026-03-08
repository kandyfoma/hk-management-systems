"""
Management command: seed_capa_demo
Creates demo IncidentInvestigation (CAPA) records for existing WorkplaceIncidents
so the CAPA dashboard has visible data.
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.occupational_health.models import WorkplaceIncident
from apps.occupational_health.models_iso45001 import IncidentInvestigation

User = get_user_model()

today = date.today()

DEMO_INVESTIGATIONS = [
    {
        "investigation_id": "INV-DEMO-001",
        "incident_index": 0,  # incident with highest severity
        "status": "closed",
        "investigation_date": today - timedelta(days=60),
        "investigation_findings": (
            "Un travailleur a subi une lacération à la main droite lors de l'utilisation du convoyeur "
            "sans porter les gants de protection obligatoires contre les coupures. Le garde de sécurité s'est avéré "
            "partiellement déplacé. Les images de surveillance ont confirmé la non-conformité aux EPI."
        ),
        "rca_method": "5why",
        "rca_documentation": (
            "1. Pourquoi : Le travailleur a-t-il été blessé ? → La main a contacté la courroie en mouvement.\n"
            "2. Pourquoi : La main a-t-elle contacté la courroie ? → Le garde de sécurité était déplacé.\n"
            "3. Pourquoi : Le garde s'était-il déplacé ? → L'inspection de maintenance était en retard de 2 semaines.\n"
            "4. Pourquoi : L'inspection était-elle en retard ? → Le système de planification n'a pas envoyé d'alertes de rappel.\n"
            "5. Pourquoi : Pas d'alertes ? → Le module de maintenance préventive a été mal configuré après la dernière mise à niveau logicielle."
        ),
        "root_causes": [
            "Erreur de configuration de la planification de la maintenance préventive",
            "Lacune du contrôle de conformité des EPI",
        ],
        "contributing_factors": [
            "Supervision insuffisante du superviseur",
            "Fatigue du travailleur (quart supplémentaire)",
        ],
        "corrective_actions": (
            "1. Réinstaller et verrouiller immédiatement le garde de sécurité sur le convoyeur CB-07.\n"
            "2. Reconfigurer les alertes de planification PM dans CMMS.\n"
            "3. Formation obligatoire de recyclage des EPI pour tous les ouvriers à la chaîne.\n"
            "4. Liste de contrôle du superviseur mise à jour pour inclure les vérifications quotidiennes des EPI."
        ),
        "corrective_action_deadline": today - timedelta(days=30),
        "corrective_action_implemented_date": today - timedelta(days=35),
        "preventive_actions": (
            "Installer des caméras de détection des EPI automatisées aux points d'entrée du convoyeur. "
            "Ajouter un audit croisé mensuel par l'agent de sécurité."
        ),
        "preventive_action_deadline": today + timedelta(days=30),
        "effectiveness_check_date": today - timedelta(days=10),
        "effectiveness_verified": True,
        "effectiveness_notes": "L'audit de suivi a confirmé la conformité des EPI à 98%. Aucune récurrence en 30 jours.",
        "completion_date": today - timedelta(days=8),
        "lessons_learned": (
            "Les mises à niveau logicielles doivent inclure une liste de contrôle de validation post-mise à niveau couvrant les modules critiques pour la sécurité. "
            "La non-conformité des EPI doit déclencher une notification immédiate du superviseur."
        ),
    },
    {
        "investigation_id": "INV-DEMO-002",
        "incident_index": 1,
        "status": "corrective_action_implemented",
        "investigation_date": today - timedelta(days=25),
        "investigation_findings": (
            "Un travailleur a glissé sur le sol mouillé dans la zone de mélange des produits chimiques. "
            "La signalisation du sol mouillé était présente, mais le revêtement antidérapant avait été retiré pour le nettoyage et non remplacé. "
            "Le travailleur a subi une entorse à la cheville ; premiers secours administrés sur site."
        ),
        "rca_method": "fishbone",
        "rca_documentation": (
            "Analyse en arête de poisson (Ishikawa) :\n"
            "HOMME : Le travailleur était conscient de la surface mouillée mais a choisi un itinéraire plus court.\n"
            "MACHINE : Revêtement antidérapant retiré au cours du nettoyage régulier.\n"
            "MÉTHODE : Le POP de nettoyage ne spécifie pas le remplacement immédiat après le lavage.\n"
            "ENVIRONNEMENT : Saison humide, condensation accrue dans la zone de mélange.\n"
            "MESURE : Aucun point de contrôle d'inspection pour le tapis après le nettoyage.\n"
            "MATÉRIEL : Matériel de tapis dégradé (nécessite un remplacement)."
        ),
        "root_causes": [
            "Le POP de nettoyage ne mandate pas le remplacement immédiat du tapis",
            "Le revêtement antidérapant dégradé n'a pas été signalé lors d'une inspection antérieure",
        ],
        "contributing_factors": [
            "Itinéraire à fort trafic utilisé pour économiser du temps",
            "Condensation accrue due aux conditions météorologiques",
        ],
        "corrective_actions": (
            "1. Mettre à jour le POP de nettoyage pour exiger le remplacement du tapis avant la réouverture de la zone.\n"
            "2. Remplacer tout le revêtement antidérapant dégradé dans la zone de mélange des produits chimiques.\n"
            "3. Ajouter l'état du tapis à la liste de contrôle de l'inspection ménagère mensuelle."
        ),
        "corrective_action_deadline": today - timedelta(days=5),
        "corrective_action_implemented_date": today - timedelta(days=7),
        "preventive_actions": "Audit trimestriel des surfaces antidérapantes pour tous les secteurs à processus humide.",
        "preventive_action_deadline": today + timedelta(days=60),
        "effectiveness_check_date": today + timedelta(days=14),
        "effectiveness_verified": False,
        "effectiveness_notes": "",
        "completion_date": None,
        "lessons_learned": (
            "Les POP doivent couvrir l'ensemble du cycle de vie de l'activité, y compris les étapes de restauration, "
            "pas seulement les étapes principales de la tâche."
        ),
    },
    {
        "investigation_id": "INV-DEMO-003",
        "incident_index": 2,
        "status": "corrective_action_planned",
        "investigation_date": today - timedelta(days=10),
        "investigation_findings": (
            "Un travailleur a signalé une gêne auditive après l'utilisation prolongée de machines de meulage sans "
            "protection auditive double telle que requise par le Plan de contrôle des risques de bruit. "
            "Un suivi audiométrique est prévu. Les niveaux de bruit mesurés à 96 dB(A) — au-dessus du seuil de 85 dB(A)."
        ),
        "rca_method": "fault_tree",
        "rca_documentation": (
            "Arbre des défaillances Événement supérieur : Gêne auditive induite par le bruit\n"
            "├── Événement A : Le travailleur n'utilise pas l'EPP double\n"
            "│   ├── A1 : Travailleur inconscient de l'exigence de protection double pour les zones >90 dB\n"
            "│   └── A2 : Bouchon auriculaire simple disponible à la station — double non approvisionné\n"
            "└── Événement B : La durée d'exposition a dépassé la limite sûre\n"
            "    ├── B1 : Le calendrier de rotation des postes n'a pas été suivi par le chef d'équipe\n"
            "    └── B2 : Le roster de rotation n'est pas affiché à la station de travail"
        ),
        "root_causes": [
            "Stock d'EPP inadéquat à la station de meulage (bouchon simple uniquement)",
            "Les travailleurs ne sont pas formés aux exigences de protection auditive zonale",
        ],
        "contributing_factors": [
            "Le calendrier de rotation des postes n'est pas appliqué",
            "La signalisation limite de la zone de bruit est inadéquate",
        ],
        "corrective_actions": (
            "1. Approvisionner à la fois les bouchons surauriculaires simples et doubles à tous les postes de travail >90 dB.\n"
            "2. Dispensaires une formation obligatoire de sensibilisation aux risques de bruit pour tous les travailleurs de la zone de meulage.\n"
            "3. Afficher le roster de rotation à chaque poste de meulage.\n"
            "4. Le chef d'équipe doit apposer un visa quotidien sur le respect de la rotation."
        ),
        "corrective_action_deadline": today + timedelta(days=14),
        "corrective_action_implemented_date": None,
        "preventive_actions": "Enquête annuelle sur le bruit et révision de l'adéquation des EPP pour toutes les zones de bruit.",
        "preventive_action_deadline": today + timedelta(days=90),
        "effectiveness_check_date": today + timedelta(days=45),
        "effectiveness_verified": False,
        "effectiveness_notes": "",
        "completion_date": None,
        "lessons_learned": "",
    },
]


class Command(BaseCommand):
    help = "Seed demo IncidentInvestigation (CAPA) records for the CAPA dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing demo investigations before seeding",
        )

    def handle(self, *args, **options):
        incidents = list(WorkplaceIncident.objects.order_by("-severity"))
        if not incidents:
            self.stdout.write(self.style.WARNING(
                "No WorkplaceIncident records found. Run seed_kcc_fresh or seed_kcc_mining_data first."
            ))
            return

        # Pick an owner user
        owner = (
            User.objects.filter(primary_role="ohs_manager").first()
            or User.objects.filter(is_superuser=True).first()
            or User.objects.first()
        )
        if not owner:
            self.stdout.write(self.style.ERROR("No users found in the database. Cannot seed CAPA data."))
            return

        if options["clear"]:
            demo_ids = [d["investigation_id"] for d in DEMO_INVESTIGATIONS]
            deleted, _ = IncidentInvestigation.objects.filter(investigation_id__in=demo_ids).delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted} existing demo investigations."))

        created_count = 0
        skipped_count = 0

        for i, spec in enumerate(DEMO_INVESTIGATIONS):
            inv_id = spec["investigation_id"]

            # Skip if already exists
            if IncidentInvestigation.objects.filter(investigation_id=inv_id).exists():
                self.stdout.write(f"  SKIP  {inv_id} (already exists)")
                skipped_count += 1
                continue

            # Map to incident — cycle through available ones
            incident_idx = spec["incident_index"] % len(incidents)
            incident = incidents[incident_idx]

            # Skip if incident already has an investigation
            if IncidentInvestigation.objects.filter(incident=incident).exists():
                # Try next incident
                for j in range(len(incidents)):
                    alt = incidents[(incident_idx + j + 1) % len(incidents)]
                    if not IncidentInvestigation.objects.filter(incident=alt).exists():
                        incident = alt
                        break
                else:
                    self.stdout.write(
                        self.style.WARNING(f"  SKIP  {inv_id} — all incidents already have investigations")
                    )
                    skipped_count += 1
                    continue

            inv = IncidentInvestigation.objects.create(
                investigation_id=inv_id,
                incident=incident,
                status=spec["status"],
                investigation_date=spec["investigation_date"],
                investigation_findings=spec["investigation_findings"],
                rca_method=spec["rca_method"],
                rca_documentation=spec["rca_documentation"],
                root_causes=spec["root_causes"],
                contributing_factors=spec["contributing_factors"],
                corrective_actions=spec["corrective_actions"],
                corrective_action_owner=owner,
                corrective_action_deadline=spec["corrective_action_deadline"],
                corrective_action_implemented_date=spec["corrective_action_implemented_date"],
                preventive_actions=spec["preventive_actions"],
                preventive_action_deadline=spec["preventive_action_deadline"],
                effectiveness_check_date=spec["effectiveness_check_date"],
                effectiveness_verified=spec["effectiveness_verified"],
                effectiveness_notes=spec["effectiveness_notes"],
                completion_date=spec["completion_date"],
                lessons_learned=spec["lessons_learned"],
            )
            inv.investigation_team.set([owner])
            self.stdout.write(
                self.style.SUCCESS(
                    f"  CREATE {inv_id} — status={spec['status']} — incident={incident.incident_number}"
                )
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created: {created_count}  Skipped: {skipped_count}"
            )
        )
