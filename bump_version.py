import json
import re
import os

def bump_version():
    print("Bumping versions for BoardSight...")
    
    # 1. Update package.json
    package_path = 'package.json'
    with open(package_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    old_version = data['version']
    parts = old_version.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    new_version = '.'.join(parts)
    
    data['version'] = new_version
    with open(package_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
        # add newline at end of file to match npm formatting
        f.write('\n')
    
    print(f"Updated package.json: {old_version} -> {new_version}")

    # 2. Update package-lock.json
    lock_path = 'package-lock.json'
    if os.path.exists(lock_path):
        with open(lock_path, 'r', encoding='utf-8') as f:
            lock_data = json.load(f)
        lock_data['version'] = new_version
        if 'packages' in lock_data and '' in lock_data['packages']:
            lock_data['packages']['']['version'] = new_version
        with open(lock_path, 'w', encoding='utf-8') as f:
            json.dump(lock_data, f, indent=2)
            f.write('\n')
        print(f"Updated package-lock.json: {old_version} -> {new_version}")

    # 3. Update sw.js CACHE_NAME
    sw_path = 'public/sw.js'
    with open(sw_path, 'r', encoding='utf-8') as f:
        sw_content = f.read()
    
    # Match: const CACHE_NAME = 'boardsight-assets-v8';
    pattern = r"(const\s+CACHE_NAME\s*=\s*['\"]boardsight-assets-v)(\d+)(['\"];)"
    
    def replacer(match):
        old_v = int(match.group(2))
        return f"{match.group(1)}{old_v + 1}{match.group(3)}"
        
    new_sw_content = re.sub(pattern, replacer, sw_content)
    
    with open(sw_path, 'w', encoding='utf-8') as f:
        f.write(new_sw_content)
        
    print(f"Updated CACHE_NAME in public/sw.js")
    print(f"Successfully bumped app version to {new_version}! Run 'npm run build' to apply.")

if __name__ == '__main__':
    bump_version()
