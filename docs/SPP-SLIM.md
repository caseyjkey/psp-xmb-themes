# Slim PSP — Custom Firmware, Theme & Homebrew (slim.psp)

Target: PSP-2000 (02g, 64MB RAM), 6.61 custom firmware, 64GB FAT32 Memory Stick.

## Current state (2026-11-07)

### Firmware
- Official **6.61** with **CXMB** theme plugin (`ms0:/seplugins/cxmb/cxmb.prx`, first line of `vsh.txt`).
- Boot firmware file present at `ms0:/PSP/GAME/UPDATE/661.PBP`.
- **Not yet** upgraded to ARK-5.2.0 (current recommended CFW). When upgrading:
  - cIPL eligibility is the PSP-2000-specific risk: board revisions **TA-085v1/v2, TA-088v1/v2, TA-090v1** support cIPL; **TA-088v3 does not**.
  - Run **pspIdent** (`ms0:/PSP/GAME/pspIdent/`) first to read the board revision.
  - ARK-5 CTF themes have reported compatibility problems; see "Theme fallback" below.
  - Keep **DC10** (in FasterARK full package) available for recovery.
- Firmware target for the "latest custom firmware" goal:
  ARK-5.2.0 via FasterARK, made permanent with New cIPL.
  https://github.com/PSP-Arkfive/FasterARK/releases/tag/ARK-5.2.0

### Theme — the Xbox 360 Blade work
Repo: `/home/trill/Development/PSP` on **Aurora** (WSL), not on Gilbert.
Docs: `~/Development/PSP/docs/ctf-conversion-findings.md` (long-running conversion log).

Key findings that changed the approach:

1. **`paf.prx` and `vshmain.prx` are effectively identical between 6.60 and 6.61.**
   - `paf.prx`: exactly **1** differing byte between 6.60 and 6.61.
   - `vshmain.prx`: exactly **2** differing bytes.
   - This means 6.60-era PRX patch records port to 6.61 far more safely than
     previously assumed. The earlier "PAF records cause CXMB fallback" results
     were caused by **combining** records, not by 6.60/6.61 incompatibility.

2. **A 6.61-native Xbox theme already existed on the stick and was never tested.**
   `ms0:/PSP/THEME/xbox 363.661.ctf` (3,829,804 bytes, magic `0xDEAD0661`,
   21 resources) is a *complete* Xbox 360 theme built for 6.61, including:
   `opening_plugin.prx/.rco` (boot logo + sound), `GAMEBOOT.PMF`,
   `01-12.BMP` + `01-12_03g.bmp` (wallpaper), `topmenu_icon.rco`,
   `topmenu_plugin.rco`, `system_plugin.rco`, `system_plugin_fg.rco`,
   plus `paf.prx` (13 diff records) and `vshmain.prx` (24 diff records).
   It was never activated because the working set was built around the
   6.60 `xbox_360.660.ctf` instead.

3. **The vertical blade layout is NOT in PAF.**
   PAF records control icon position/spacing floats. The vertical Xbox blade
   geometry lives in `vshmain.prx` diff records and/or `topmenu_plugin.rco`
   layout data. PAF-only experiments could never produce vertical blades.

4. **`system_plugin_fg.rco` foreground port is blocked by a hard constraint.**
   The old Xbox foreground RCOs are structurally different from clean 6.61
   (size 18,740 vs 34,336). Clock/date text edits in a rebuilt
   `system_plugin_fg0.rco` are **safe and active** (confirmed: huge red
   clock appeared). Battery plane edits are **unsafe**: swapping the image
   reference or applying large scale values causes an immediate CXMB fallback
   to stock. Battery must be changed one attribute at a time from the clean
   6.61 base, keeping original `tex_battery` / `tex_battery_shadow` refs.

### Settings column reorder (USB Connection to top) — DONE, awaiting on-device check
The XMB Settings item order lives in **`vshmain.prx`**, in two parallel arrays:

- **Entry table** at file offset `0x54BC0` (vaddr `0x54B20`), 16 bytes per row:
  `category index, subcategory index, model rights, region rights`.
  Settings rows are the rows with category = 0. Stock order (subcategory index):
  `0` System Update, `1` **USB Connection**, `2` Video, `3` Photo, `4` System,
  `5` Theme, `6` Date/Time, `7` Power Save, `8` Bluetooth, `9` Display,
  `10` Sound, `11` Security, `12` RSS, `13` Network.
- **Icon table** at file offset `0x55024`, 20 bytes per row:
  `main icon ptr, focused icon ptr, model rights, region rights, shadow icon ptr`.
  **Verified parallel to the entry table**: the model/region fields of entry row
  *i* match icon row *i* for all 14 rows. The tables must be swapped together,
  otherwise icons and labels desynchronise.

To move USB Connection to the top, rows 0 and 1 are **swapped in both arrays**.
This was verified in-binary: entry subcategory sequence becomes
`0x1, 0x0, 0x2, 0x3, ...`.

Result: **8 CXMB diff records** against clean 6.61 `vshmain.prx`:
```
0x00054b24  01        # entry row 0 subcategory -> 1 (USB)
0x00054b34  00        # entry row 1 subcategory -> 0 (System Update)
0x00054f85  49        # icon row 0 ptr1 -> 0x4949 ('I')
0x00054f89  57        # icon row 0 ptr2 -> 0x5749
0x00054f95  56        # icon row 1 ptr1 -> 0x5643
0x00054f99  48
0x00054f9d  56
0x00054fa9  55
```

Built themes (both verified on the Memory Stick):
- `/PSP/THEME/xbox_363_test/xbox363_661_usb_top.ctf` — **ACTIVE**
  3,829,760 bytes, sha256 `037beb8738c9f92ccd6cd78f7f5a8bc0d93898e4de3863c027b4b16eb322d9b4`
  = full 6.61 Xbox 363 theme (24 vshmain records) **+ 8 reorder records**.
- `/PSP/THEME/xbox_363_test/661icons_usb_top.ctf` — fallback, 1,322,452 bytes,
  sha256 `00dfe4708108067ea00fe716c2906013d239b0934903966eb5cb5096703b0c9d`
  = the known-good boot+wallpaper+icons baseline **+ reorder only**.
- `/PSP/THEME/xbox_363_test/xbox363_661_plain.ctf` — unmodified 6.61 Xbox theme.
- `/PSP/THEME/xbox_363_test/xbox_363_safe.661.ctf` — safe variant.

**To apply a different theme:** edit `ms0:/seplugins/cxmb/conf.txt` to the
theme path + `ms0`, then on the PSP press **Select -> Reset VSH**.
Note: the PSP usually drops off USB after a VSH reset. Re-enter USB mode before
editing `conf.txt` again.

**Theme fallback behaviour:** when CXMB hits an unusable resource it silently
falls back to a stock XMB (wallpaper may survive). That is the symptom to watch
for, not a crash.

### Homebrew installed (2026-11-07)
All in `ms0:/PSP/GAME/`:

| App | Version | Why |
|---|---|---|
| **Tilefinch** | v0.1.46 (2026-11-06) | Full web browser on the PSP: HTTPS, JS, WebAssembly, WebSockets, on-device YouTube playback, reader mode, radial keyboard. Requires 64MB. https://github.com/stjanovitz/tilefinch |
| **traxpsp** | 1.0.0 (2026-10-09) | Modern music player: FLAC/ALAC/AAC/Opus/ATRAC, cue albums, 13 visualisers, 10-band EQ. https://github.com/traxpsp/traxpsp |
| **SSSPlayer** | v0.2.8 (2026-10-07) | Media player. https://github.com/SergioSSantiago/SSSPlayer-PSP |
| **CMFileManager** | v4.12 | File manager / image viewer / FTP. https://github.com/joel16/CMFileManager-PSP |
| **PSPHUD** | 2.02 | Battery %, CPU/BUS clock, FPS overlay + screenshot. https://github.com/ErikPshat/PSP-HUD |
| **pspIdent** | v3.1 | Reads model + **motherboard revision** — required before any cIPL flash. https://github.com/Yoti/psp_pspident |

### Password-locking the Video folder
There is **no per-folder PIN lock** in any PSP CFW. Options, best first:
1. **Lock The Folder** (`https://www.gamebrew.org/wiki/Lock_The_Folder_PSP`) —
   password-protects `ms0:/VIDEO`, `MUSIC`, `PICTURE`, `ISO`, etc. Password
   stored in `ms0:/PSP/SYSTEM/systema.cfg`. Legacy (6.20 TN-D era); unverified
   on 6.61.
2. **Password Lock** (`passlock.prx`) — 4-digit PIN on the **whole XMB**.
   https://www.gamebrew.org/wiki/Password_Lock_PSP
3. **XMB Item Hider** — hides the Video column entirely. Caveat: fully hiding a
   column left of Game (Photo/Music/Video) causes duplicated Memory Stick
   entries and crashes waking from sleep.
4. **HideFile PRX** — hides Photo/Music/Video/ISO with an access code to unhide.
5. **Zero-risk** — move videos off `ms0:/VIDEO/` so the column shows nothing.

### Custom boot logo + startup sound
- Coldboot logo/wave -> `flash0:/vsh/resource/opening_plugin.rco`
- Coldboot sound -> `flash0:/vsh/module/opening_plugin.prx` (ATRAC3, <= 49,376 bytes)
- Gameboot animation -> `flash0:/vsh/resource/gameboot.pmf`
The 6.61 Xbox theme already carries its own `opening_plugin.prx/.rco` and
`GAMEBOOT.PMF`, so the Xbox boot animation and sound should come with the theme.
Never write these to flash0 — RCO writes can semi-brick.

### Hardware notes for the PSP-2000
- **No IPS screen mod possible on the 2000** (1000/3000 only). Realistic option
  is an OEM-style LCD replacement; aftermarket 2000 LCDs are often faulty.
- Replace the battery with an **OSTENT 1400mAh**; generic gold "3600mAh" cells
  are frequently fake/defective. https://opista.com/posts/psp-modding-guide
- Analog stick replacement is the most common 2000 wear item.
- Sticky buttons are usually just dust behind the faceplate membrane.

## Tools / environment
- Theme work happens on **Aurora**: `~/Development/PSP` (WSL).
  Tooling: `scripts/ctf-inventory.mjs`, `ctf-extract.mjs`, `ctf-keep.mjs`,
  `ctf-replace.mjs`, `ctf-diff-dump.mjs`, `ctf-diff-subset.mjs`,
  `scripts/prx-diff-report.py`, RCOMage, CXMB source, extracted 6.60 + 6.61
  firmware under `firmware/`.
- Node on Aurora is not on the default PATH; use
  `export PATH=$HOME/.nvm/versions/node/v23.6.0/bin:$PATH`.
- The PSP is exposed on the Aurora Windows host as `D:` (64GB FAT32, ~36GB free).
  PowerShell runs at
  `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`.
- Existing PS Buddy app on the stick at `ms0:/PSP/GAME/PSPBUDDY/` (v0.9.4-alpha,
  sha256 `0759213960350280721a880895a4029b93e8591a8084477c82fd37b21d386c17`).
