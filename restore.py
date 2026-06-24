import json
import re

log_path = r"C:\Users\tanap\.gemini\antigravity-ide\brain\1c63728c-8288-4314-8800-8fbcb56d08cd\.system_generated\logs\transcript.jsonl"

part1 = []
part2 = []

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    pass
            
            # Check if this is a tool response
            if data.get("type") == "TOOL_RESPONSE" and "content" in data:
                content = data["content"]
                if "File Path: `file:///c:/Users/tanap/Documents/Project_DetectCar/frontend/src/pages/Home.jsx`" in content:
                    if "Showing lines 1 to 800" in content:
                        part1 = content.split("remove the line number, colon, and leading space.\n")[1].split("The above content")[0].strip().split('\n')
                    elif "Showing lines 800 to 1510" in content:
                        part2 = content.split("remove the line number, colon, and leading space.\n")[1].split("The above content")[0].strip().split('\n')
        except Exception as e:
            pass

def clean_lines(raw_lines):
    cleaned = []
    for line in raw_lines:
        # Match '123: original text'
        match = re.match(r'^\d+:\s?(.*)$', line)
        if match:
            cleaned.append(match.group(1))
        else:
            cleaned.append(line)
    return cleaned

lines1 = clean_lines(part1)
lines2 = clean_lines(part2)

# Combine, but be careful because line 800 might overlap
# Actually lines 1 to 800 means 1-800 inclusive, and 800 to 1510 means 800-1510 inclusive.
# Let's just use lines 1-799 from part1 and all of part2.
if len(lines1) > 0 and len(lines2) > 0:
    final_lines = lines1[:799] + lines2
    
    # Write to file
    out_path = r"c:\Users\tanap\Documents\Project_DetectCar\frontend\src\pages\Home.jsx"
    with open(out_path, 'w', encoding='utf-8') as out:
        out.write('\n'.join(final_lines) + '\n')
    print("Successfully restored Home.jsx with length:", len(final_lines))
else:
    print("Failed to find both parts.")
    print("Part 1 length:", len(lines1))
    print("Part 2 length:", len(lines2))
