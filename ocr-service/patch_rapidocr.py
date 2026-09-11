import rapidocr_onnxruntime, os

pkg_dir = os.path.dirname(rapidocr_onnxruntime.__file__)
utils_path = os.path.join(pkg_dir, 'utils.py')

with open(utils_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace update_rec_params with clean dict stripping
old_rec_block = """    def update_rec_params(self, config, rec_dict):
        if rec_dict:
            need_remove_prefix = ['rec_model_path']
            new_rec_dict = {}
            for k, v in rec_dict.items():
                if k in need_remove_prefix:
                    k = k.split('rec_')[1]
                new_rec_dict[k] = v

            if not new_rec_dict['model_path']:
                new_rec_dict['model_path'] = str(
                    root_dir / config['model_path'])
            config.update(new_rec_dict)
        return config"""

new_rec_block = """    def update_rec_params(self, config, rec_dict):
        if rec_dict:
            new_rec_dict = {}
            for k, v in rec_dict.items():
                if k.startswith('rec_'):
                    k = k[4:]
                new_rec_dict[k] = v

            if 'model_path' in new_rec_dict and not new_rec_dict['model_path']:
                new_rec_dict['model_path'] = str(
                    root_dir / config['model_path'])
            config.update(new_rec_dict)
        return config"""

if old_rec_block in text:
    text = text.replace(old_rec_block, new_rec_block)
    with open(utils_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully patched update_rec_params in rapidocr utils.py!")
else:
    print("Exact block not matched, rewriting method directly")
    # If not exact match, write custom
    lines = text.splitlines(True)
    new_lines = []
    in_rec = False
    for line in lines:
        if "def update_rec_params" in line:
            in_rec = True
            new_lines.append(new_rec_block + "\n")
        elif in_rec and line.startswith("    def "):
            in_rec = False
            new_lines.append(line)
        elif not in_rec:
            new_lines.append(line)
    with open(utils_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Patched update_rec_params by replacement")
