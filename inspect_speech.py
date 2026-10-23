with open('E:/Project/starlife/starlife_doc/StarLife路演PPT/build_speech_docx.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# find variable assignments
lines = text.split('\n')
for i, l in enumerate(lines):
    if 'def add_speech_section' in l or 'SPEECH_DATA' in l or 'slides_data' in l:
        print(f"Line {i}: {l}")
    if 'StarLife-1-WSV' in l or '世界状态' in l and ('def ' in l or '=' in l):
        print(f"Line {i}: {l}")

# Let's search for "slide 3" or "slide 03"
for i, l in enumerate(lines):
    if '1. 项目简介' in l or '3. 核心技术' in l or '2. 产品' in l or '5. 发展现状' in l:
        print(f"Line {i}: {l}")
        for j in range(i, min(i+40, len(lines))):
            print(f"  {lines[j]}")
        print("-----------------------------------------")
