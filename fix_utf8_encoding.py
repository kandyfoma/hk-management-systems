#!/usr/bin/env python3
import os
import glob

replacements = {
    'SuccÃ¨s': 'Succès',
    'd\'audiomÃ©trie': 'd\'audiométrie',
    'crÃ©Ã©': 'créé',
    'supprimÃ©': 'supprimé',
    'Tests d\'AudiomÃ©trie': 'Tests d\'Audiométrie',
    'd\'AudiomÃ©trie': 'd\'Audiométrie',
    'trouvÃ©': 'trouvé',
    'FrÃ©quence': 'Fréquence',
    'BilatÃ©ral': 'Bilatéral',
    'DÃ©tail': 'Détail',
    'Ã‰valuations': 'Évaluations',
    'PrÃ©vention': 'Prévention',
    'Aucune Ã©valuation': 'Aucune évaluation',
    'ExpirÃ©': 'Expiré',
    'DÃ©f.': 'Déf.',
    'RÃ©partition': 'Répartition',
    'â€"': '–',
    'rÃ©sultats': 'résultats',
    'rÃ©el': 'réel',
    'trouvÃ©': 'trouvé',
    # Additional characters
    'Ã‰': 'É',
    'Ã©': 'é',
    'Ã': 'à',
    'Ã Â': '–',
    'Ã¢â‚¬â€™': "'",
    'Ã©valuation': 'évaluation',
    'Ã©levÃ©e': 'élevée',
    'Ã‰levÃ‰': 'ÉLEVÉ',
    'MÃ©thode': 'Méthode',
    'RÃ©vision': 'Révision',
    'ClÃ´turÃ©s': 'Clôturés',
    'SantÃ© Mentale': 'Santé Mentale',
    'DÃ©pistage': 'Dépistage',
    'AnxiÃ©tÃ©': 'Anxiété',
    'Ã‰levÃ©e': 'Élevée',
    'DÃ©pression': 'Dépression',
    'NÃ©gatif': 'Négatif',
    'Suivi rÃ©gulier': 'Suivi régulier',
    'Ã‰tat satisfaisant': 'État satisfaisant',
    'Ã‰valuation de l\'audition': 'Évaluation de l\'audition',
    'Nouvelle Ã‰valuation Ergonomique': 'Nouvelle Évaluation Ergonomique',
    'â€ ': '–',
    'âœ"': '✓',
    'âš ': '⚠',
}

fixed_files = []

for fpath in glob.glob('frontend/src/**/*.tsx', recursive=True):
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for old, new in replacements.items():
            content = content.replace(old, new)
        if content != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed_files.append(fpath)
    except Exception as e:
        pass

for f in fixed_files:
    print(f'Fixed: {f}')

print(f'Total files fixed: {len(fixed_files)}')

