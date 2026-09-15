import re, sys
chunk = sys.argv[1]
content = open(chunk).read()
# Find SELECT, FROM keywords and print nearby
patterns = ['SELECT', 'FROM', 'WHERE']
for pat in patterns:
    for m in re.finditer(re.escape(pat), content):
        idx = m.start()
        print(f'\n=== {pat} at {idx} ===')
        print(content[max(0, idx-100):idx+500])
        print('---')
        break
