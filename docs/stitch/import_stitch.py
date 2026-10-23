import json
import os
import urllib.request

project_meta_path = r"C:\Users\Rakesh\.gemini\antigravity\brain\44a084da-b826-4302-9f24-827e67231072\.system_generated\steps\14\output.txt"
screens_meta_path = r"C:\Users\Rakesh\.gemini\antigravity\brain\44a084da-b826-4302-9f24-827e67231072\.system_generated\steps\18\output.txt"

with open(project_meta_path, 'r', encoding='utf-8') as f:
    project_data = json.load(f)

with open(screens_meta_path, 'r', encoding='utf-8') as f:
    screens_data = json.load(f)

base_dir = r"d:\Projects\Ledger"
screens_dir = os.path.join(base_dir, "screens")
os.makedirs(screens_dir, exist_ok=True)

# Save project.json
with open(os.path.join(base_dir, "project.json"), 'w', encoding='utf-8') as f:
    json.dump(project_data, f, indent=2)

# Save DESIGN.md
design_md = project_data.get("designTheme", {}).get("designMd", "")
if design_md:
    with open(os.path.join(base_dir, "DESIGN.md"), 'w', encoding='utf-8') as f:
        f.write(design_md)

# Mapping screen names to ordered filenames
screen_order = [
    ("a2ee562e8d8a482486adeb8d04f923a8", "01-login-step-1", "Login - Step 1"),
    ("7f53bb1f83db4e3c81f3865e32c10c2a", "02-login-step-2-otp", "Login - Step 2 (OTP)"),
    ("1c1dc2a529fd45258c6d0100647e01dd", "03-login-step-2-otp-error", "Login - Step 2 (OTP Error)"),
    ("74a9b84cdb5940d2b422fe1b8b36a76b", "04-ledger-home", "Ledger Home"),
    ("c27f77f2bd774924abcdb14ff7cf988c", "05-ledger-home-empty", "Ledger Home - Empty State"),
    ("95597d7b438947e6bafb3694a2bd1da8", "06-new-entry-form", "New Entry Form"),
    ("a2751601cfa34cd7a0359ddd51520fc0", "07-new-entry-validation-error", "New Entry - Validation Error"),
    ("7bd36879d42041818964065c75cc9bc7", "08-entry-details-overdue", "Entry Details - Sneha Iyer (Overdue)"),
    ("a67db0f4c09b4abfb83ec6973ec22440", "09-entry-details-settled", "Entry Details - Sneha Iyer (Settled)"),
]

screen_map = {s["name"].split("/")[-1]: s for s in screens_data.get("screens", [])}

headers = {'User-Agent': 'Mozilla/5.0'}

downloaded_screens = []

for s_id, file_slug, default_title in screen_order:
    screen_info = screen_map.get(s_id)
    if not screen_info:
        print(f"Screen {s_id} not found in screens_data!")
        continue
    
    title = screen_info.get("title", default_title)
    html_url = screen_info.get("htmlCode", {}).get("downloadUrl")
    img_url = screen_info.get("screenshot", {}).get("downloadUrl")
    
    html_file = os.path.join(screens_dir, f"{file_slug}.html")
    img_file = os.path.join(screens_dir, f"{file_slug}.png")
    
    print(f"Downloading {title} -> {file_slug}...")
    
    if html_url:
        req = urllib.request.Request(html_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            html_content = resp.read().decode('utf-8')
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    if img_url:
        req = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            img_bytes = resp.read()
        with open(img_file, 'wb') as f:
            f.write(img_bytes)
            
    downloaded_screens.append({
        "id": s_id,
        "title": title,
        "slug": file_slug,
        "html_file": f"screens/{file_slug}.html",
        "img_file": f"screens/{file_slug}.png",
        "width": screen_info.get("width", "780"),
        "height": screen_info.get("height", "1768"),
        "deviceType": screen_info.get("deviceType", "MOBILE")
    })

with open(os.path.join(base_dir, "screens_manifest.json"), 'w', encoding='utf-8') as f:
    json.dump(downloaded_screens, f, indent=2)

print("Import completed successfully!")
