import os, re
import glob

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # If it's a DTO that we already added explicit getters for, just remove lombok imports
    content = re.sub(r'import lombok\..*?;\n', '', content)
    content = re.sub(r'@Data\n?', '', content)
    content = re.sub(r'@AllArgsConstructor\n?', '', content)
    content = re.sub(r'@NoArgsConstructor\n?', '', content)
    
    # Process @RequiredArgsConstructor
    if '@RequiredArgsConstructor' in content:
        content = content.replace('@RequiredArgsConstructor\n', '')
        # Find class name
        class_match = re.search(r'public class (\w+)', content)
        if class_match:
            class_name = class_match.group(1)
            # Find all private final fields
            fields = re.findall(r'private\s+final\s+([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*;', content)
            if fields:
                # generate constructor
                constructor = f"\n    public {class_name}("
                constructor += ", ".join([f"{f[0]} {f[1]}" for f in fields])
                constructor += ") {\n"
                for f in fields:
                    constructor += f"        this.{f[1]} = {f[1]};\n"
                constructor += "    }\n"
                
                # insert constructor after last private final field
                last_field = f"private final {fields[-1][0]} {fields[-1][1]};"
                content = content.replace(last_field, last_field + "\n" + constructor)

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src/main/java'):
    for file in files:
        if file.endswith('.java'):
            process_file(os.path.join(root, file))
