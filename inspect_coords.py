with open('site.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lb = text.find('id="leaderboard"')
chart_start = text.find('<svg', lb)
chart_end = text.find('</svg></div></div>', lb)
svg_content = text[chart_start:chart_end]

import re
circles = re.findall(r'<circle[^>]+cx="([^"]+)"[^>]+cy="([^"]+)"', svg_content)
cxs = [float(c[0]) for c in circles]
cys = [float(c[1]) for c in circles]

print(f"Total circles: {len(circles)}")
print(f"CX range: min={min(cxs)}, max={max(cxs)}")
print(f"CY range: min={min(cys)}, max={max(cys)}")

# Find model labels
labels = re.findall(r'<text[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]*>(.*?)</text>', svg_content)
print(f"\nTotal texts: {len(labels)}")
for t in labels:
    clean = re.sub(r'<[^>]+>', '', t[2])
    print(f"x={t[0]:<7} y={t[1]:<7} text={clean}")
