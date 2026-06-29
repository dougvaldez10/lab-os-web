import sys

with open("src/app/page.js", "r") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if "return (" in line and "const handleGenerateReceipt" not in line and "return" == line.strip().split()[0]:
        # Need to make sure it's the main return
        if i > 1100:
            if "div className=\"w-full relative flex flex-col items-center\"" in lines[i+1]:
                # This is a return for StackedCases or something else
                pass
            elif "<div className=" in lines[i+1] or "<>" in lines[i+1]:
                pass

with open("src/app/page.js", "w") as f:
    f.writelines(new_lines)
