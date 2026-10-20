with open('site.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lb = text.find('id="leaderboard"')
chart_start = text.find('<svg', lb)
chart_end = text.find('</svg></div></div>', lb)

svg_content = text[chart_start:chart_end]

import re
paths = re.findall(r'<path[^>]+d="[^"]+"[^>]*>', svg_content)
print(f"Total paths in chart: {len(paths)}")
for p in paths[:6]:
    print("Path:", p)

circles = re.findall(r'<circle[^>]+>', svg_content)
print(f"\nTotal circles in chart: {len(circles)}")
for c in circles[:6]:
    print("Circle:", c)

texts = re.findall(r'<text[^>]+>.*?</text>', svg_content)
print(f"\nTotal texts in chart: {len(texts)}")
for t in texts[:15]:
    print("Text:", t)
