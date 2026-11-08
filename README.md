# PSP XMB Themes

Workbench for converting and shipping PSP XMB (cross-media bar) themes for
custom firmware, with CXMB as the theme engine.

Target hardware for the current work: **PSP-2000 (02g, 64 MB)**, official
**6.61** firmware + CXMB, 64 GB FAT32 Memory Stick.

## Layout

| Path | What it is |
|---|---|
| `themes/` | Finished CTF themes, ready to drop in `ms0:/PSP/THEME/` |
| `scripts/` | CTF and PRX tooling (Node + Python) |
| `docs/` | Conversion findings, offsets, and the working notes for each build |
| `CXMB/` | Upstream CXMB plugin source (for reference on CTF/diff semantics) |
| `firmware/` | Extracted 6.60 / 6.61 firmware. **Git-ignored**: Sony-owned and large |
| `work/` | Scratch builds and extracted CTF trees. **Git-ignored** |

## The CTF format, briefly

A CXMB theme is a `.CTF`: a PTF blob (wallpaper + preview) followed by a table
of resources, each either a raw file (RCO / BMP / PMF / PRX) or a **diff record
list** for a PRX.

The magic at offset `0x10` must match the firmware, so `0xDEAD0660` for 6.60 and
`0xDEAD0661` for 6.61. CXMB accepts a 6.60 magic on 6.61, but rewriting it is
one byte plus a header re-sign and removes a whole class of doubt.

For the three PRX files CXMB patches (`paf.prx`, `common_gui.prx`,
`vshmain.prx`), the resource holds a list of `(offset, size, bytes)` records
instead of the module itself. Each record is written into the running module at
`text_addr + offset`, so **offsets are runtime (text-relative)**, not file
offsets:

- `vshmain.prx` — text base `0xa0`
- `paf.prx` — text base `0xc0`

## Key findings

### 6.60 and 6.61 are nearly identical where it matters

`paf.prx` differs by exactly **1 byte** between 6.60 and 6.61; `vshmain.prx` by
exactly **2 bytes**. A 6.60-era patch record therefore ports to 6.61 unless it
lands on one of those three bytes.

`scripts/validate-ctf-for-firmware.py` checks a CTF's records against a target
firmware and reports any that land on a differing byte. It is the gate to run
before shipping any converted theme.

### The vertical blade layout lives in `vshmain.prx` and `paf.prx`, not in PAF alone

PAF records hold icon position/spacing floats. The Xbox 360 "blade" geometry
needs the `vshmain.prx` records too. PAF-only experiments cannot produce
vertical blades — they only move icons around inside a horizontal row.

### The XMB Settings column order is a `vshmain.prx` table

Two **parallel arrays** in `vshmain.prx`:

- entry table at file offset `0x54BC0`, 16 bytes per row:
  `category, subcategory, model rights, region rights`
- icon table at file offset `0x55024`, 20 bytes per row:
  `main icon ptr, focused icon ptr, model rights, region rights, shadow icon ptr`

The Settings rows are the rows with category `0`. The arrays are parallel: the
model/region fields of entry row *i* equal icon row *i*. **Swap both together**
or labels and icons desynchronise.

Stock order (subcategory index): `0` System Update, `1` USB Connection,
`2` Video, `3` Photo, `4` System, `5` Theme, `6` Date/Time, `7` Power Save,
`8` Bluetooth, `9` Display, `10` Sound, `11` Security, `12` RSS, `13` Network.

`scripts/build-settings-reorder.py` swaps rows 0 and 1 in both arrays and emits
the 8 diff records that result.

### `system_plugin_fg.rco` foreground is the hard part

The old Xbox foreground RCOs are structurally different from clean 6.61
(18,740 vs 34,336 bytes). Clock/date text edits in a rebuilt
`system_plugin_fg0.rco` are safe and active. Battery plane edits are not:
changing the image reference or using large scale values causes an immediate
CXMB fallback to a stock XMB. Change the battery one attribute at a time from
the clean 6.61 base, keeping the original `tex_battery` / `tex_battery_shadow`
references.

## Failure modes

- **CXMB falls back silently.** An unusable resource produces a stock XMB
  (the wallpaper may survive). It does not crash. Treat "looks stock" as a
  patch failure, not a theme bug.
- **A bad PRX patch can hang VSH.** The PSP boots to a black screen. Recover
  with: hold power up 10s to force off, hold **R** while powering on, disable
  CXMB under Plugins in ARK Recovery, reboot.
- **The PSP drops off USB after a VSH reset.** Re-enter USB mode before editing
  `conf.txt` again.

## Applying a theme

1. Copy the CTF to `ms0:/PSP/THEME/<name>/`.
2. `ms0:/seplugins/cxmb/conf.txt` — theme path on line 1, `ms0` on line 2.
3. `ms0:/seplugins/vsh.txt` — `ms0:/seplugins/cxmb/cxmb.prx 1` on the **first**
   line.
4. On the PSP: **Select → Reset VSH**.

## Scripts

| Script | Purpose |
|---|---|
| `ctf-inspect.py` | Dump a CTF's resource table and decode its diff records |
| `ctf-inventory.mjs` | One-line summary of a CTF or a directory of them |
| `ctf-diff-dump.mjs` | Print a CTF's PRX diff records |
| `ctf-diff-subset.mjs` | Rebuild a CTF keeping only selected diff records |
| `ctf-extract.mjs` / `ctf-keep.mjs` / `ctf-replace.mjs` | Extract, filter, and replace CTF resources |
| `ctf-to-661.py` | Rewrite a CTF's magic to 6.61 and re-sign its header table |
| `validate-ctf-for-firmware.py` | Check a CTF's patch records against a target firmware |
| `build-settings-reorder.py` | Build the XMB Settings reorder CTF |
| `paf-record-context.py` | Disassemble the code around a PAF patch record |
