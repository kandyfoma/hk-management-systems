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
            "Worker suffered a laceration on the right hand while operating the conveyor belt "
            "without wearing mandatory cut-resistant gloves. The safety guard was found to be "
            "partially displaced. CCTV footage confirmed PPE non-compliance."
        ),
        "rca_method": "5why",
        "rca_documentation": (
            "1. Why: Worker was injured? → Hand contacted moving belt.\n"
            "2. Why: Hand contacted belt? → Safety guard was displaced.\n"
            "3. Why: Guard was displaced? → Maintenance inspection was overdue by 2 weeks.\n"
            "4. Why: Inspection was overdue? → Scheduling system did not send reminder alerts.\n"
            "5. Why: No alerts? → Preventive maintenance module was misconfigured after last software upgrade."
        ),
        "root_causes": [
            "Preventive maintenance scheduling misconfiguration",
            "PPE compliance monitoring gap",
        ],
        "contributing_factors": [
            "Inadequate supervisor oversight",
            "Worker fatigue (overtime shift)",
        ],
        "corrective_actions": (
            "1. Immediately re-install and lock safety guard on conveyor CB-07.\n"
            "2. Reconfigure PM scheduling alerts in CMMS.\n"
            "3. Mandatory refresher PPE training for all line workers.\n"
            "4. Supervisor checklist updated to include daily PPE spot-checks."
        ),
        "corrective_action_deadline": today - timedelta(days=30),
        "corrective_action_implemented_date": today - timedelta(days=35),
        "preventive_actions": (
            "Install automated PPE detection cameras at conveyor entry points. "
            "Add monthly cross-audit by Safety Officer."
        ),
        "preventive_action_deadline": today + timedelta(days=30),
        "effectiveness_check_date": today - timedelta(days=10),
        "effectiveness_verified": True,
        "effectiveness_notes": "Follow-up audit confirmed PPE compliance at 98%. No recurrence in 30-day period.",
        "completion_date": today - timedelta(days=8),
        "lessons_learned": (
            "Software upgrades must include a post-upgrade validation checklist covering safety-critical modules. "
            "PPE non-compliance must trigger immediate supervisor notification."
        ),
    },
    {
        "investigation_id": "INV-DEMO-002",
        "incident_index": 1,
        "status": "corrective_action_implemented",
        "investigation_date": today - timedelta(days=25),
        "investigation_findings": (
            "Worker slipped on a wet floor in the chemical mixing area. "
            "Wet floor signage was present, however anti-slip matting had been removed for cleaning and not replaced. "
            "Worker sustained a sprained ankle; first aid administered on-site."
        ),
        "rca_method": "fishbone",
        "rca_documentation": (
            "Fishbone analysis (Ishikawa):\n"
            "MAN: Worker aware of wet surface but chose shorter route.\n"
            "MACHINE: Anti-slip matting removed during routine cleaning.\n"
            "METHOD: Cleaning SOP does not specify immediate replacement after mopping.\n"
            "ENVIRONMENT: Wet season, increased condensation in mixing area.\n"
            "MEASUREMENT: No inspection checkpoint for matting after cleaning.\n"
            "MATERIAL: Matting material degraded (requires replacement)."
        ),
        "root_causes": [
            "Cleaning SOP does not mandate immediate mat replacement",
            "Degraded anti-slip matting not flagged during prior inspection",
        ],
        "contributing_factors": [
            "High-traffic route used to save time",
            "Increased condensation due to weather",
        ],
        "corrective_actions": (
            "1. Update Cleaning SOP to require mat replacement before area is re-opened.\n"
            "2. Replace all degraded anti-slip matting in chemical mixing area.\n"
            "3. Add matting condition to monthly housekeeping inspection checklist."
        ),
        "corrective_action_deadline": today - timedelta(days=5),
        "corrective_action_implemented_date": today - timedelta(days=7),
        "preventive_actions": "Quarterly anti-slip surface audit for all wet-process areas.",
        "preventive_action_deadline": today + timedelta(days=60),
        "effectiveness_check_date": today + timedelta(days=14),
        "effectiveness_verified": False,
        "effectiveness_notes": "",
        "completion_date": None,
        "lessons_learned": (
            "SOPs must cover the full activity lifecycle including restoration steps, "
            "not just the primary task steps."
        ),
    },
    {
        "investigation_id": "INV-DEMO-003",
        "incident_index": 2,
        "status": "corrective_action_planned",
        "investigation_date": today - timedelta(days=10),
        "investigation_findings": (
            "Worker reported hearing discomfort after extended operation of grinding machinery without "
            "double hearing protection as required by the Noise Hazard Control Plan. "
            "Audiometry follow-up scheduled. Noise levels measured at 96 dB(A) — above 85 dB(A) threshold."
        ),
        "rca_method": "fault_tree",
        "rca_documentation": (
            "Fault Tree Top Event: Noise-induced hearing discomfort\n"
            "├── Event A: Worker not using double HPE\n"
            "│   ├── A1: Worker unaware of double-protection requirement for >90 dB areas\n"
            "│   └── A2: Single earplug available at station — double not stocked\n"
            "└── Event B: Exposure duration exceeded safe limit\n"
            "    ├── B1: Job rotation schedule not followed by team leader\n"
            "    └── B2: Rotation roster not displayed at workstation"
        ),
        "root_causes": [
            "Inadequate HPE stock at grinding station (single earplug only)",
            "Workers not trained on zonal hearing protection requirements",
        ],
        "contributing_factors": [
            "Job rotation schedule not enforced",
            "Noise zone boundary signage inadequate",
        ],
        "corrective_actions": (
            "1. Stock both single and double HPE at all >90 dB workstations.\n"
            "2. Conduct mandatory noise hazard awareness training for all grinding area workers.\n"
            "3. Display rotation roster at each grinding station.\n"
            "4. Team leader to sign off on rotation compliance daily."
        ),
        "corrective_action_deadline": today + timedelta(days=14),
        "corrective_action_implemented_date": None,
        "preventive_actions": "Annual noise survey and HPE adequacy review for all noise zones.",
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
