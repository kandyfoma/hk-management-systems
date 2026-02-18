// ═══════════════════════════════════════════════════════════════════════════
// Occupational Health — Protocol Seed Data
// ═══════════════════════════════════════════════════════════════════════════
// Source: Company-provided protocol JSON, extended with labels, descriptions
// and additional sectors/positions for completeness.
//
// Structure:
//   MEDICAL_EXAM_CATALOG  — central dictionary of all exam codes
//   OCC_SECTORS_DATA       — sector → department → position → protocols tree
// ═══════════════════════════════════════════════════════════════════════════

import {
  MedicalExamCatalogEntry,
  OccSector,
} from '../models/OccHealthProtocol';

// ─── Medical Exam Catalog ─────────────────────────────────────
// Every exam code referenced in any protocol MUST exist here.
// This is the single source of truth for exam metadata.

export const MEDICAL_EXAM_CATALOG: MedicalExamCatalogEntry[] = [
  // ── Clinique ────────────────────────────────────────────────
  {
    code: 'EXAM_CLINIQUE_COMPLET',
    label: 'Examen Clinique Complet',
    category: 'clinique',
    description: 'Examen physique général complet avec anamnèse',
    mandatory: true,
  },
  {
    code: 'SATURATION_O2',
    label: 'Saturation en Oxygène (SpO₂)',
    category: 'clinique',
    description: 'Mesure de la saturation pulsée en oxygène par oxymétrie',
  },
  {
    code: 'IMC',
    label: 'Indice de Masse Corporelle (IMC)',
    category: 'clinique',
    description: 'Calcul du rapport poids/taille²',
  },
  {
    code: 'TA',
    label: 'Tension Artérielle (TA)',
    category: 'clinique',
    description: 'Mesure de la pression artérielle systolique et diastolique',
  },

  // ── Biologique ──────────────────────────────────────────────
  {
    code: 'NFS',
    label: 'Numération Formule Sanguine (NFS)',
    category: 'biologique',
    description: 'Hémogramme complet : globules rouges, blancs, plaquettes',
  },
  {
    code: 'UREE_CREATININE',
    label: 'Urée & Créatinine',
    category: 'biologique',
    description: 'Bilan rénal de base',
  },
  {
    code: 'BILAN_HEPATIQUE',
    label: 'Bilan Hépatique',
    category: 'biologique',
    description: 'ALAT, ASAT, GGT, Phosphatase alcaline, Bilirubine',
  },
  {
    code: 'GLYCEMIE_A_JEUN',
    label: 'Glycémie à Jeun',
    category: 'biologique',
    description: 'Taux de glucose sanguin après 8h de jeûne',
  },
  {
    code: 'BILAN_LIPIDIQUE',
    label: 'Bilan Lipidique',
    category: 'biologique',
    description: 'Cholestérol total, HDL, LDL, Triglycérides',
  },
  {
    code: 'CRP',
    label: 'Protéine C-Réactive (CRP)',
    category: 'biologique',
    description: 'Marqueur inflammatoire systémique',
  },

  // ── Toxicologie ─────────────────────────────────────────────
  {
    code: 'PLOMBEMIE',
    label: 'Plombémie (Pb sanguin)',
    category: 'toxicologie',
    description: 'Dosage du plomb dans le sang — surveillance exposition mines',
    requiresSpecialist: false,
  },
  {
    code: 'COBALTEMIE',
    label: 'Cobaltémie (Co sanguin)',
    category: 'toxicologie',
    description: 'Dosage du cobalt dans le sang — surveillance exposition mines',
  },
  {
    code: 'TEST_ALCOOL_DROGUE',
    label: 'Test Alcool & Drogues',
    category: 'toxicologie',
    description: 'Dépistage rapide alcoolémie + cannabis, cocaïne, opiacés, amphétamines',
  },

  // ── Imagerie ────────────────────────────────────────────────
  {
    code: 'RADIO_THORAX',
    label: 'Radiographie Thoracique (F+P)',
    category: 'imagerie',
    description: 'Cliché thoracique de face et profil — dépistage pneumoconiose, tuberculose',
    requiresSpecialist: true,
  },

  // ── Fonctionnel ─────────────────────────────────────────────
  {
    code: 'SPIROMETRIE',
    label: 'Spirométrie (EFR)',
    category: 'fonctionnel',
    description: 'Exploration fonctionnelle respiratoire : CVF, VEMS, VEMS/CVF, DEP',
  },
  {
    code: 'AUDIOGRAMME',
    label: 'Audiogramme Tonal (0,5–8 kHz)',
    category: 'fonctionnel',
    description: 'Mesure des seuils auditifs — surveillance exposition au bruit',
  },

  // ── Cardiologique ────────────────────────────────────────────
  {
    code: 'ECG_REPOS',
    label: 'ECG de Repos (12 dérivations)',
    category: 'cardiologique',
    description: 'Électrocardiogramme au repos — dépistage troubles du rythme',
  },
  {
    code: 'TEST_EFFORT',
    label: "Test d'Effort (Ergomètre)",
    category: 'cardiologique',
    description: "Épreuve d'effort sur vélo ou tapis roulant avec surveillance ECG",
    requiresSpecialist: true,
  },

  // ── Ophtalmologie ────────────────────────────────────────────
  {
    code: 'TEST_VISION_COMPLETE',
    label: 'Bilan Visuel Complet',
    category: 'ophtalmologie',
    description: 'Acuité visuelle de près et de loin, réfraction, stéréoscopie',
  },
  {
    code: 'TEST_VISION_NOCTURNE',
    label: 'Vision Nocturne',
    category: 'ophtalmologie',
    description: "Test d'adaptation à l'obscurité et de vision en faible luminosité",
  },
  {
    code: 'TEST_CHAMP_VISUEL',
    label: 'Champ Visuel (Périmétrie)',
    category: 'ophtalmologie',
    description: "Périmétrie automatisée — détection glaucome, scotomes",
    requiresSpecialist: true,
  },
  {
    code: 'TEST_PERCEPTION_COULEUR',
    label: 'Perception des Couleurs (Ishihara)',
    category: 'ophtalmologie',
    description: 'Test de discrimination chromatique — dépistage daltonisme',
  },
  {
    code: 'EXAMEN_OPHTALMOLOGIQUE',
    label: 'Examen Ophtalmologique Complet',
    category: 'ophtalmologie',
    description: 'Examen spécialisé fond d\'œil, lampe à fente, PIO',
    requiresSpecialist: true,
  },

  // ── Neurologique ─────────────────────────────────────────────
  {
    code: 'TEST_EQUILIBRE',
    label: "Test d'Équilibre (Romberg / Unterberger)",
    category: 'neurologique',
    description: "Évaluation de l'équilibre statique et dynamique — travail en hauteur",
  },
  {
    code: 'TEST_REFLEXES',
    label: 'Test des Réflexes Ostéo-Tendineux',
    category: 'neurologique',
    description: 'Évaluation des réflexes neurologiques de base',
  },

  // ── Psychotechnique ──────────────────────────────────────────
  {
    code: 'EVALUATION_PSYCHOTECHNIQUE',
    label: 'Évaluation Psychotechnique',
    category: 'psychotechnique',
    description: 'Tests de temps de réaction, coordination, perception spatiale — conduite engins',
    requiresSpecialist: true,
  },

  // ── Psychosocial ─────────────────────────────────────────────
  {
    code: 'EVALUATION_STRESS',
    label: 'Évaluation du Stress Professionnel',
    category: 'psychosocial',
    description: 'Questionnaire standardisé (Karasek, Maslach) — burn-out, charge mentale',
  },

  // ── Aptitude ─────────────────────────────────────────────────
  {
    code: 'APTITUDE_TRAVAIL_HAUTEUR',
    label: 'Aptitude Travail en Hauteur',
    category: 'aptitude',
    description: 'Évaluation médicale spécifique pour travail en hauteur (>3m)',
  },
  {
    code: 'TEST_APTITUDE_ESPACE_CONFINE',
    label: 'Aptitude Espace Confiné',
    category: 'aptitude',
    description: "Test médical et psychologique pour travail en espace confiné",
  },
];

// ─── Lookup map (code → entry) ────────────────────────────────
export const EXAM_CATALOG_MAP: Record<string, MedicalExamCatalogEntry> =
  Object.fromEntries(MEDICAL_EXAM_CATALOG.map((e) => [e.code, e]));

// ─── Sector / Department / Position / Protocol Tree ───────────

export const OCC_SECTORS_DATA: OccSector[] = [
  // ════════════════════════════════════════════════════════════
  // SECTEUR MINIER
  // ════════════════════════════════════════════════════════════
  {
    code: 'MIN',
    name: 'Minier',
    industrySectorKey: 'mining',
    departments: [
      // ── Mine Souterraine ─────────────────────────────────────
      {
        code: 'MIN_UNDER',
        name: 'Mine Souterraine',
        sectorCode: 'MIN',
        positions: [
          {
            code: 'FOREUR',
            name: 'Foreur / Dynamiteur',
            departmentCode: 'MIN_UNDER',
            sectorCode: 'MIN',
            typicalExposures: ['silica_dust', 'noise', 'vibration', 'confined_spaces', 'heavy_metals'],
            recommendedPPE: ['hard_hat', 'ear_plugs', 'dust_mask', 'safety_boots', 'safety_gloves'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'Code Minier RDC · ILO C176 · Décret N°18/025',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                  'ECG_REPOS',
                  'NFS',
                  'UREE_CREATININE',
                  'BILAN_HEPATIQUE',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                  'CRP',
                  'TEST_VISION_COMPLETE',
                  'TEST_VISION_NOCTURNE',
                  'TEST_APTITUDE_ESPACE_CONFINE',
                  'SATURATION_O2',
                ],
                recommendedExams: ['GLYCEMIE_A_JEUN', 'BILAN_LIPIDIQUE'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                regulatoryNote: 'Code Minier RDC · ILO C176 — Surveillance annuelle obligatoire',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                  'ECG_REPOS',
                ],
                recommendedExams: ['NFS', 'BILAN_HEPATIQUE', 'CRP'],
              },
              {
                visitType: 'return_to_work',
                visitTypeLabel: 'Visite de Reprise',
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'SATURATION_O2',
                  'SPIROMETRIE',
                ],
              },
              {
                visitType: 'post_incident',
                visitTypeLabel: 'Visite Post-Accident',
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SATURATION_O2',
                  'NFS',
                ],
              },
            ],
          },
          {
            code: 'MINEUR_SOUTERRAIN',
            name: 'Mineur Souterrain',
            departmentCode: 'MIN_UNDER',
            sectorCode: 'MIN',
            typicalExposures: ['silica_dust', 'coal_dust', 'noise', 'confined_spaces', 'heat_stress'],
            recommendedPPE: ['hard_hat', 'ear_plugs', 'dust_mask', 'safety_boots', 'safety_gloves', 'high_vis_vest'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'Code Minier RDC · ILO C176',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                  'NFS',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                  'SATURATION_O2',
                  'TEST_APTITUDE_ESPACE_CONFINE',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                ],
              },
            ],
          },
        ],
      },

      // ── Conduite Engins Lourds ────────────────────────────────
      {
        code: 'MIN_ENGINS',
        name: 'Conduite Engins Lourds',
        sectorCode: 'MIN',
        positions: [
          {
            code: 'CHAUFFEUR_MINE',
            name: "Conducteur d'Engins (Mine)",
            departmentCode: 'MIN_ENGINS',
            sectorCode: 'MIN',
            typicalExposures: ['noise', 'vibration', 'diesel_exhaust', 'heat_stress'],
            recommendedPPE: ['hard_hat', 'ear_plugs', 'safety_boots', 'high_vis_vest'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'Code Minier RDC · ILO C167 · Permis CACES',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'GLYCEMIE_A_JEUN',
                  'BILAN_LIPIDIQUE',
                  'AUDIOGRAMME',
                  'TEST_CHAMP_VISUEL',
                  'TEST_PERCEPTION_COULEUR',
                  'TEST_REFLEXES',
                  'EVALUATION_PSYCHOTECHNIQUE',
                  'TEST_ALCOOL_DROGUE',
                ],
                recommendedExams: ['NFS', 'UREE_CREATININE'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique (2 ans)',
                validityMonths: 24,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'GLYCEMIE_A_JEUN',
                  'TEST_CHAMP_VISUEL',
                  'TEST_ALCOOL_DROGUE',
                ],
              },
            ],
          },
        ],
      },

      // ── Traitement / Métallurgie ──────────────────────────────
      {
        code: 'MIN_PROCESS',
        name: 'Traitement & Métallurgie',
        sectorCode: 'MIN',
        positions: [
          {
            code: 'OPERATEUR_METALLURGIE',
            name: 'Opérateur Métallurgie',
            departmentCode: 'MIN_PROCESS',
            sectorCode: 'MIN',
            typicalExposures: ['heavy_metals', 'chemical_exposure', 'heat_stress', 'noise'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                  'UREE_CREATININE',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'PLOMBEMIE',
                  'COBALTEMIE',
                  'BILAN_HEPATIQUE',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR TÉLÉCOMMUNICATIONS
  // ════════════════════════════════════════════════════════════
  {
    code: 'TEL',
    name: 'Télécommunications',
    industrySectorKey: 'telecom_it',
    departments: [
      // ── Techniciens Pylône ────────────────────────────────────
      {
        code: 'TEL_PYLONE',
        name: 'Techniciens Pylône / Travaux en Hauteur',
        sectorCode: 'TEL',
        positions: [
          {
            code: 'TECH_HAUTEUR',
            name: 'Technicien Travail en Hauteur',
            departmentCode: 'TEL_PYLONE',
            sectorCode: 'TEL',
            typicalExposures: ['working_at_heights', 'electrical', 'non_ionizing_radiation'],
            recommendedPPE: ['hard_hat', 'fall_harness', 'safety_boots', 'safety_gloves'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'ILO C155 · Norme EN 363 (EPI anti-chute)',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_EFFORT',
                  'AUDIOGRAMME',
                  'TEST_EQUILIBRE',
                  'TEST_VISION_COMPLETE',
                  'GLYCEMIE_A_JEUN',
                  'BILAN_LIPIDIQUE',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                ],
                recommendedExams: ['NFS', 'UREE_CREATININE'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_EQUILIBRE',
                  'TEST_VISION_COMPLETE',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                ],
              },
            ],
          },
        ],
      },

      // ── Ingénieurs / Techniciens Réseaux ─────────────────────
      {
        code: 'TEL_RESEAU',
        name: 'Ingénierie & Réseaux',
        sectorCode: 'TEL',
        positions: [
          {
            code: 'INGENIEUR_RESEAU',
            name: 'Ingénieur Réseau / Télécom',
            departmentCode: 'TEL_RESEAU',
            sectorCode: 'TEL',
            typicalExposures: ['ergonomic', 'vdt_screen', 'psychosocial', 'sedentary'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TEST_VISION_COMPLETE',
                  'ECG_REPOS',
                ],
                recommendedExams: ['GLYCEMIE_A_JEUN', 'EVALUATION_STRESS'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TEST_VISION_COMPLETE',
                ],
                recommendedExams: ['EVALUATION_STRESS', 'IMC', 'TA'],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR BANQUE / FINANCE
  // ════════════════════════════════════════════════════════════
  {
    code: 'BAN',
    name: 'Banque & Finance',
    industrySectorKey: 'banking_finance',
    departments: [
      // ── Administration & Cadres ────────────────────────────────
      {
        code: 'BAN_ADMIN',
        name: 'Administration & Cadres',
        sectorCode: 'BAN',
        positions: [
          {
            code: 'CADRE',
            name: 'Cadre Supérieur',
            departmentCode: 'BAN_ADMIN',
            sectorCode: 'BAN',
            typicalExposures: ['ergonomic', 'psychosocial', 'vdt_screen', 'sedentary'],
            protocols: [
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                regulatoryNote: 'ILO C155 · Code du Travail RDC Art. 176',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TA',
                  'GLYCEMIE_A_JEUN',
                  'BILAN_LIPIDIQUE',
                  'ECG_REPOS',
                  'TEST_EFFORT',
                  'IMC',
                  'EVALUATION_STRESS',
                  'EXAMEN_OPHTALMOLOGIQUE',
                ],
                recommendedExams: ['NFS', 'BILAN_HEPATIQUE'],
              },
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TA',
                  'GLYCEMIE_A_JEUN',
                  'BILAN_LIPIDIQUE',
                  'ECG_REPOS',
                  'IMC',
                  'TEST_VISION_COMPLETE',
                ],
              },
            ],
          },
          {
            code: 'EMPLOYE_BUREAU',
            name: 'Employé de Bureau',
            departmentCode: 'BAN_ADMIN',
            sectorCode: 'BAN',
            typicalExposures: ['ergonomic', 'vdt_screen', 'sedentary'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TEST_VISION_COMPLETE',
                  'TA',
                  'IMC',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TEST_VISION_COMPLETE',
                  'TA',
                ],
                recommendedExams: ['GLYCEMIE_A_JEUN', 'EVALUATION_STRESS'],
              },
            ],
          },
        ],
      },

      // ── Sécurité / Gardiennage ────────────────────────────────
      {
        code: 'BAN_SECU',
        name: 'Sécurité & Gardiennage',
        sectorCode: 'BAN',
        positions: [
          {
            code: 'AGENT_SECU_BAN',
            name: 'Agent de Sécurité',
            departmentCode: 'BAN_SECU',
            sectorCode: 'BAN',
            typicalExposures: ['psychosocial', 'shift_work', 'violence_aggression'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_VISION_COMPLETE',
                  'TEST_REFLEXES',
                  'EVALUATION_PSYCHOTECHNIQUE',
                  'TEST_ALCOOL_DROGUE',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_VISION_COMPLETE',
                  'TEST_ALCOOL_DROGUE',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR BTP / CONSTRUCTION
  // ════════════════════════════════════════════════════════════
  {
    code: 'BTP',
    name: 'BTP & Construction',
    industrySectorKey: 'construction',
    departments: [
      {
        code: 'BTP_CHANTIER',
        name: 'Chantier & Gros Œuvre',
        sectorCode: 'BTP',
        positions: [
          {
            code: 'MACON',
            name: 'Maçon / Coffreur',
            departmentCode: 'BTP_CHANTIER',
            sectorCode: 'BTP',
            typicalExposures: ['silica_dust', 'noise', 'working_at_heights', 'ergonomic', 'manual_handling'],
            recommendedPPE: ['hard_hat', 'safety_glasses', 'dust_mask', 'safety_boots', 'safety_gloves'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'RADIO_THORAX',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                  'NFS',
                ],
                recommendedExams: ['TEST_VISION_COMPLETE', 'SATURATION_O2'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'SPIROMETRIE',
                  'AUDIOGRAMME',
                ],
              },
            ],
          },
          {
            code: 'ELECTRICIEN_BTP',
            name: 'Électricien Bâtiment',
            departmentCode: 'BTP_CHANTIER',
            sectorCode: 'BTP',
            typicalExposures: ['electrical', 'working_at_heights', 'noise'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_VISION_COMPLETE',
                  'TEST_REFLEXES',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR SANTÉ (Hôpital / Clinique)
  // ════════════════════════════════════════════════════════════
  {
    code: 'SANTE',
    name: 'Santé & Soins',
    industrySectorKey: 'healthcare',
    departments: [
      {
        code: 'SANTE_SOINS',
        name: 'Soins Infirmiers & Cliniques',
        sectorCode: 'SANTE',
        positions: [
          {
            code: 'INFIRMIER',
            name: 'Infirmier(e)',
            departmentCode: 'SANTE_SOINS',
            sectorCode: 'SANTE',
            typicalExposures: ['biological', 'needle_stick', 'ergonomic', 'psychosocial', 'chemical_exposure'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'Code du Travail RDC · OMS Healthy Workplaces',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                  'UREE_CREATININE',
                  'CRP',
                ],
                recommendedExams: ['EVALUATION_STRESS', 'TEST_VISION_COMPLETE'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                ],
                recommendedExams: ['EVALUATION_STRESS'],
              },
            ],
          },
          {
            code: 'MEDECIN',
            name: 'Médecin',
            departmentCode: 'SANTE_SOINS',
            sectorCode: 'SANTE',
            typicalExposures: ['biological', 'psychosocial', 'radiation', 'ergonomic'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                  'ECG_REPOS',
                ],
                recommendedExams: ['EVALUATION_STRESS'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                ],
                recommendedExams: ['EVALUATION_STRESS', 'TA'],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR TRANSPORT & LOGISTIQUE
  // ════════════════════════════════════════════════════════════
  {
    code: 'TRANS',
    name: 'Transport & Logistique',
    industrySectorKey: 'transport',
    departments: [
      {
        code: 'TRANS_ROUTE',
        name: 'Transport Routier',
        sectorCode: 'TRANS',
        positions: [
          {
            code: 'CHAUFFEUR_POIDS_LOURD',
            name: 'Chauffeur Poids Lourd',
            departmentCode: 'TRANS_ROUTE',
            sectorCode: 'TRANS',
            typicalExposures: ['ergonomic', 'vibration', 'diesel_exhaust', 'psychosocial', 'shift_work'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'Code de la Route · ILO C153',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'GLYCEMIE_A_JEUN',
                  'BILAN_LIPIDIQUE',
                  'TEST_VISION_COMPLETE',
                  'TEST_CHAMP_VISUEL',
                  'TEST_PERCEPTION_COULEUR',
                  'TEST_REFLEXES',
                  'EVALUATION_PSYCHOTECHNIQUE',
                  'TEST_ALCOOL_DROGUE',
                  'AUDIOGRAMME',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique (2 ans)',
                validityMonths: 24,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'GLYCEMIE_A_JEUN',
                  'TEST_VISION_COMPLETE',
                  'TEST_ALCOOL_DROGUE',
                ],
              },
              {
                visitType: 'fitness_for_duty',
                visitTypeLabel: 'Aptitude Conduite Spéciale',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'TEST_VISION_COMPLETE',
                  'TEST_REFLEXES',
                  'EVALUATION_PSYCHOTECHNIQUE',
                  'TEST_ALCOOL_DROGUE',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR AGRICULTURE
  // ════════════════════════════════════════════════════════════
  {
    code: 'AGR',
    name: 'Agriculture & Agroalimentaire',
    industrySectorKey: 'agriculture',
    departments: [
      {
        code: 'AGR_CHAMP',
        name: 'Production Agricole',
        sectorCode: 'AGR',
        positions: [
          {
            code: 'APPLICATEUR_PESTICIDE',
            name: 'Applicateur de Pesticides',
            departmentCode: 'AGR_CHAMP',
            sectorCode: 'AGR',
            typicalExposures: ['pesticides', 'chemical_exposure', 'heat_stress', 'ergonomic'],
            recommendedPPE: ['respirator', 'chemical_suit', 'safety_gloves', 'safety_boots', 'face_shield'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                  'UREE_CREATININE',
                  'SPIROMETRIE',
                ],
                recommendedExams: ['CRP'],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Semestrielle',
                validityMonths: 6,
                regulatoryNote: 'Surveillance renforcée — exposition pesticides',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'NFS',
                  'BILAN_HEPATIQUE',
                  'SPIROMETRIE',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // SECTEUR ÉNERGIE & UTILITIES
  // ════════════════════════════════════════════════════════════
  {
    code: 'NRG',
    name: 'Énergie & Services Publics',
    industrySectorKey: 'energy_utilities',
    departments: [
      {
        code: 'NRG_ELEC',
        name: 'Réseau Électrique',
        sectorCode: 'NRG',
        positions: [
          {
            code: 'ELECTRICIEN_HT',
            name: 'Électricien Haute Tension',
            departmentCode: 'NRG_ELEC',
            sectorCode: 'NRG',
            typicalExposures: ['electrical', 'working_at_heights', 'noise', 'confined_spaces'],
            recommendedPPE: ['safety_harness_electrical', 'hard_hat', 'safety_gloves', 'safety_boots', 'fall_harness'],
            protocols: [
              {
                visitType: 'pre_employment',
                visitTypeLabel: "Visite d'Embauche",
                validityMonths: 0,
                regulatoryNote: 'IEC 60900 · Habilitation électrique',
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'TEST_REFLEXES',
                  'TEST_VISION_COMPLETE',
                  'TEST_EQUILIBRE',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                  'TEST_APTITUDE_ESPACE_CONFINE',
                ],
              },
              {
                visitType: 'periodic',
                visitTypeLabel: 'Visite Périodique Annuelle',
                validityMonths: 12,
                requiredExams: [
                  'EXAM_CLINIQUE_COMPLET',
                  'ECG_REPOS',
                  'APTITUDE_TRAVAIL_HAUTEUR',
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Derived Convenience Maps ─────────────────────────────────
// Use OccHealthProtocolService for all queries; these are internal raw maps.

/** All sectors indexed by code for O(1) access */
export const SECTORS_BY_CODE: Record<string, OccSector> = Object.fromEntries(
  OCC_SECTORS_DATA.map((s) => [s.code, s])
);

/** Flat map of all positions by positionCode for O(1) access */
export const POSITIONS_BY_CODE: Record<string, import('../models/OccHealthProtocol').OccPosition> =
  Object.fromEntries(
    OCC_SECTORS_DATA.flatMap((s) =>
      s.departments.flatMap((d) => d.positions.map((p) => [p.code, p]))
    )
  );

/** Flat map of all departments by code */
export const DEPARTMENTS_BY_CODE: Record<string, import('../models/OccHealthProtocol').OccDepartment> =
  Object.fromEntries(
    OCC_SECTORS_DATA.flatMap((s) => s.departments.map((d) => [d.code, d]))
  );
