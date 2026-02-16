import re

path = r'src\modules\hospital\screens\AppointmentSchedulerScreen.tsx'
with open(path, 'r', encoding='utf-8-sig') as f:
    text = f.read()

original_len = len(text)

# Fix ═ followed by stray \x90 (remnant of double-encoded ══)
text = text.replace('\u2550\u0090', '\u2550')
# Fix ─ followed by stray chars
text = text.replace('\u2500\u0090', '\u2500')
# Box drawing character ─ (U+2500): â"€ mojibake (U+00E2 U+201D U+20AC)
text = text.replace('\u00e2\u201d\u20ac', '\u2500')
# 📅 emoji (U+00F0 U+0178 U+201C U+2026)
text = text.replace('\u00f0\u0178\u201c\u2026', '\U0001F4C5')
# 📝 emoji
text = text.replace('\u00f0\u0178\u201c\u009d', '\U0001F4DD')
# • bullet
text = text.replace('\u00e2\u20ac\u00a2', '\u2022')

# Check for any remaining non-ASCII suspicious sequences
remaining_issues = []
for i, ch in enumerate(text):
    if ord(ch) in range(0x80, 0xA0):  # C1 control characters (likely mojibake remnants)
        ctx = text[max(0,i-10):i+10]
        remaining_issues.append(f"  Pos {i}: U+{ord(ch):04X} in: {repr(ctx)}")

if remaining_issues:
    print(f"Found {len(remaining_issues)} potential remaining issues:")
    for issue in remaining_issues[:20]:
        print(issue)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print(f"File updated. Length: {original_len} -> {len(text)}")
print("Checking key strings...")
checks = ['Rendez-vous', 'Cr\u00e9er', 'M\u00e9decin', 'S\u00e9lectionner', 'Confirm\u00e9']
for check in checks:
    if check in text:
        print(f"  OK: '{check}' found")
    else:
        print(f"  MISSING: '{check}'")
