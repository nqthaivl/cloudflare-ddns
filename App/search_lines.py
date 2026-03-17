content = open('static/js/app.js', encoding='utf-8').read()
lines = content.splitlines()
for i, line in enumerate(lines, 1):
    low = line.lower()
    if 'tunnel' in low or 'route' in low:
        print(f'{i}: {line[:120]}')
