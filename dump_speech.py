with open('E:/Project/starlife/starlife_doc/StarLife路演PPT/build_speech_docx.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# find all sections
sections = re.findall(r'(\d{2})",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\),\s*\{[^}]*?"speaker_notes":\s*"""(.*?)"""', text, re.DOTALL)
print(f"Found {len(sections)} sections")

for num, title, dur, timerange, words, notes in sections:
    if num in ['03', '04', '05', '07']:
        print(f"\n=================== [{num}] {title} ===================")
        print(notes.strip())
