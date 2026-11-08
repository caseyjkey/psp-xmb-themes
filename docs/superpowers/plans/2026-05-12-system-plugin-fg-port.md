# System Plugin FG Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Xbox 360 theme topbar/battery foreground on a clean 6.61 `system_plugin_fg.rco` base without CXMB fallback.

**Architecture:** Treat foreground styling as an RCO port, not a raw resource transplant. Keep the clean 6.61 `system_plugin_fg.rco` object tree and import only Xbox-specific image resources and narrow battery/topbar/clock attributes from the old theme.

**Tech Stack:** PSP 6.61 OFW extracted resources, CXMB CTF packing scripts in `scripts/`, RCOMage/Resurssiklunssi for RCO conversion/dump/rebuild, PowerShell for PSP Memory Stick deployment.

---

### Task 1: Verify And Prepare Source Files

**Files:**
- Read: `firmware/6.61/extracted/F0/vsh/resource/system_plugin_fg.rco`
- Read: `work/psp_target_xbox_360_660/vsh/resource/system_plugin_fg.rco`
- Read: `work/psp_target_xbox_360_660/vsh/resource/system_plugin_fg0.rco`
- Create/Update: `work/fg_port/notes/md5.txt`

- [x] **Step 1: Create foreground port workspace**

```bash
mkdir -p work/fg_port/{clean_661,old_xbox,notes}
cp firmware/6.61/extracted/F0/vsh/resource/system_plugin_fg.rco work/fg_port/clean_661/system_plugin_fg.rco
cp work/psp_target_xbox_360_660/vsh/resource/system_plugin_fg.rco work/fg_port/old_xbox/system_plugin_fg.rco
cp work/psp_target_xbox_360_660/vsh/resource/system_plugin_fg0.rco work/fg_port/old_xbox/system_plugin_fg0.rco
md5sum work/fg_port/clean_661/system_plugin_fg.rco work/fg_port/old_xbox/system_plugin_fg.rco work/fg_port/old_xbox/system_plugin_fg0.rco > work/fg_port/notes/md5.txt
```

Expected:

```text
197e1b1094e782c9cfee6a46ef911c01  work/fg_port/clean_661/system_plugin_fg.rco
82cac2b0f3557ea1ae05b45bf03b7b81  work/fg_port/old_xbox/system_plugin_fg.rco
001a30efa22c86234c8c2ddaf20a2cd2  work/fg_port/old_xbox/system_plugin_fg0.rco
```

- [x] **Step 2: Confirm useful old Xbox labels exist**

```bash
strings -a -n 3 work/fg_port/old_xbox/system_plugin_fg.rco | grep -E 'battery|clock|infobar|page_indicator|anim_battery'
strings -a -n 3 work/fg_port/old_xbox/system_plugin_fg0.rco | grep -E 'battery|clock|infobar|page_indicator|anim_battery'
```

Expected labels include:

```text
tex_battery
tex_battery_shadow
tex_infobar
page_indicator
battery_shadow
battery
clock
anim_battery_charging
anim_battery_not_charging
```

### Task 2: Get RCO Dump Tooling Working

**Files:**
- Read/Build: `RCOMage/`
- Create: `work/fg_port/tooling-notes.md`

- [ ] **Step 1: Try native RCOMage build**

```bash
cd RCOMage
./autogen.sh && ./configure && make -j"$(nproc)"
```

Expected if dependencies are missing:

```text
./autogen.sh: 6: autoreconf: not found
```

- [ ] **Step 2: If native build is blocked, document Windows tool path**

Create `work/fg_port/tooling-notes.md`:

```markdown
# RCO Tooling Notes

Native RCOMage build is blocked in WSL if `autoreconf` is missing.

Windows fallback:

1. Run Resurssiklunssi on:
   - `work/fg_port/clean_661/system_plugin_fg.rco`
   - `work/fg_port/old_xbox/system_plugin_fg.rco`
   - `work/fg_port/old_xbox/system_plugin_fg0.rco`
2. Save converted/editable outputs under:
   - `work/fg_port/clean_661/editable/system_plugin_fg.rco`
   - `work/fg_port/old_xbox/editable/system_plugin_fg.rco`
   - `work/fg_port/old_xbox/editable/system_plugin_fg0.rco`
3. Dump each converted RCO with RCOMage.
```

### Task 3: Dump Clean And Old Foreground RCOs

**Files:**
- Read: `work/fg_port/clean_661/editable/system_plugin_fg.rco`
- Read: `work/fg_port/old_xbox/editable/system_plugin_fg.rco`
- Read: `work/fg_port/old_xbox/editable/system_plugin_fg0.rco`
- Create: `work/fg_port/clean_661/dump/system_plugin_fg.xml`
- Create: `work/fg_port/old_xbox/dump/system_plugin_fg.xml`
- Create: `work/fg_port/old_xbox/dump/system_plugin_fg0.xml`

- [ ] **Step 1: Dump clean 6.61 foreground**

```bash
rcomage dump work/fg_port/clean_661/editable/system_plugin_fg.rco \
  work/fg_port/clean_661/dump/system_plugin_fg.xml \
  --resdir work/fg_port/clean_661/dump/res \
  --no-decomp-warn
```

Expected: XML file plus extracted resources under `work/fg_port/clean_661/dump/res`.

- [ ] **Step 2: Dump old Xbox foreground files**

```bash
rcomage dump work/fg_port/old_xbox/editable/system_plugin_fg.rco \
  work/fg_port/old_xbox/dump/system_plugin_fg.xml \
  --resdir work/fg_port/old_xbox/dump/res_fg \
  --no-decomp-warn

rcomage dump work/fg_port/old_xbox/editable/system_plugin_fg0.rco \
  work/fg_port/old_xbox/dump/system_plugin_fg0.xml \
  --resdir work/fg_port/old_xbox/dump/res_fg0 \
  --no-decomp-warn
```

Expected: XML files plus extracted image resources.

### Task 4: Identify Portable Foreground Assets

**Files:**
- Read: `work/fg_port/clean_661/dump/system_plugin_fg.xml`
- Read: `work/fg_port/old_xbox/dump/system_plugin_fg.xml`
- Read: `work/fg_port/old_xbox/dump/system_plugin_fg0.xml`
- Create: `work/fg_port/notes/foreground-object-map.md`

- [ ] **Step 1: Search object names**

```bash
grep -niE 'battery|clock|date|time|shadow|infobar|wallpaper|page_|anim_' work/fg_port/clean_661/dump/system_plugin_fg.xml > work/fg_port/notes/clean_fg_names.txt
grep -niE 'battery|clock|date|time|shadow|infobar|wallpaper|page_|anim_' work/fg_port/old_xbox/dump/system_plugin_fg.xml > work/fg_port/notes/old_fg_names.txt
grep -niE 'battery|clock|date|time|shadow|infobar|wallpaper|page_|anim_' work/fg_port/old_xbox/dump/system_plugin_fg0.xml > work/fg_port/notes/old_fg0_names.txt
```

Expected: old dumps show battery/topbar objects; clean dump shows the 6.61 equivalent object names.

- [ ] **Step 2: Write object map**

Create `work/fg_port/notes/foreground-object-map.md`:

```markdown
# Foreground Object Map

| Surface | Clean 6.61 Object | Old Xbox Object | Port Method |
| --- | --- | --- | --- |
| Battery image | TBD from `clean_fg_names.txt` | `battery` / `tex_battery` | Replace image reference only first |
| Battery shadow | TBD from `clean_fg_names.txt` | `battery_shadow` / `tex_battery_shadow` | Replace image reference only first |
| Clock/date | TBD from `clean_fg_names.txt` | `clock` | Copy minimal color/position attrs after image-only build works |
| Top strip / info bar | TBD from `clean_fg_names.txt` | `infobar` / `tex_infobar` | Use existing 6.61 object if present; do not import old page wholesale |
```

Replace each `TBD` after reading `clean_fg_names.txt`.

### Task 5: Build The First Rebuilt Foreground

**Files:**
- Modify: `work/fg_port/clean_661/dump/system_plugin_fg.xml`
- Copy images from: `work/fg_port/old_xbox/dump/res_fg*/`
- Create: `work/fg_port/builds/system_plugin_fg_image_swap.rco`

- [ ] **Step 1: Copy only Xbox image assets into the clean dump resource tree**

Copy the old Xbox image files corresponding to `tex_battery`, `tex_battery_shadow`, and `tex_infobar` into the clean 6.61 dump resource folder. Preserve the clean XML structure and update only image file references if names differ.

- [ ] **Step 2: Compile image-swap foreground**

```bash
rcomage compile work/fg_port/clean_661/dump/system_plugin_fg.xml \
  work/fg_port/builds/system_plugin_fg_image_swap.rco \
  --pack-hdr none \
  --pack-res zlib \
  --pack-cmp none
```

Expected: `work/fg_port/builds/system_plugin_fg_image_swap.rco` exists and can be tested alone.

### Task 6: Test Rebuilt Foreground In A Minimal CTF

**Files:**
- Read: `work/fg_port/builds/system_plugin_fg_image_swap.rco`
- Create: `work/builds/fg_port/fg_image_swap_only.ctf`

- [ ] **Step 1: Package only the rebuilt foreground with the known-good baseline**

```bash
mkdir -p work/builds/fg_port
node scripts/ctf-replace.mjs \
  work/builds/target_visual/target_boot_661icons.ctf \
  work/builds/fg_port/fg_image_swap_only.ctf \
  /vsh/resource/system_plugin_fg.rco=work/fg_port/builds/system_plugin_fg_image_swap.rco
```

- [ ] **Step 2: Copy and activate on PSP**

```powershell
$dest="D:\PSP\THEME\xbox_fg_port"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item -Force "work\builds\fg_port\fg_image_swap_only.ctf" $dest
[System.IO.File]::WriteAllText("D:\seplugins\cxmb\conf.txt", "/PSP/THEME/xbox_fg_port/fg_image_swap_only.ctf`nms0`n")
```

Expected on PSP after `Select -> Reset VSH`:

- Custom boot still works.
- Custom menu bars/icons remain.
- No CXMB fallback.
- Battery/topbar art changes if image references were mapped correctly.

If styling falls back to stock, revert the last imported image/reference and retest.
