with open('site.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

lb = text.find('id="leaderboard"')
chart_start = text.find('<svg', lb)
chart_end = text.find('</svg>', chart_start)

print("=== BEFORE CHART CONTROLS ===")
print(text[lb:chart_start])

print("\n=== CHART SVG HEAD ===")
print(text[chart_start:chart_start+800])

print("\n=== CHART SVG TAIL & AFTER ===")
print(text[chart_end-500:chart_end+1000])
