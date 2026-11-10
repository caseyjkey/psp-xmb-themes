# Xbox 360 Blades theme for PSP

Bring the original 2005 Xbox 360 **vertical Blades dashboard** to the PSP XMB.
This repository contains ready-to-install CTF builds for PSP firmware 6.60 and
6.61, plus the tools and research used to port and validate the theme.

> **Current milestone:** vertical blades work on real hardware. The 6.61 build
> has been tested on a PSP-2000 Slim (02g). A second, more complete classic
> theme is now available and awaiting its hardware check.

## Download

Use the build matching your PSP's **system software version**:

| PSP firmware | File | What you get |
|---|---|---|
| 6.61 | [Download `Blade_661.ctf`](https://github.com/caseyjkey/psp-xmb-themes/releases/download/v0.2.0/Blade_661.ctf) | **Recommended.** Modern Blade theme by TheDelm, retargeted to 6.61. Vertical blades confirmed on hardware. |
| 6.60 | [Download `Blade_660.ctf`](https://github.com/caseyjkey/psp-xmb-themes/releases/download/v0.2.0/Blade_660.ctf) | The same modern Blade theme, unmodified upstream build. |
| 6.60 | [Download `xbox_360_660_classic.ctf`](https://github.com/caseyjkey/psp-xmb-themes/releases/download/v0.2.0/xbox_360_660_classic.ctf) | The classic 2008-era Xbox 360 dashboard theme: real blade artwork, icons for every category, and the Xbox-styled clock. Read [Legacy classic theme](#legacy-classic-theme) first. |

Do not install the 6.60 build on 6.61 merely because the PSP model matches.
The firmware number, not whether the PSP is a 1000/2000/3000/Go/Street, selects
the CTF build.

**Pick one theme.** Applying the classic theme over the Blade theme replaces your
XMB entirely, including the boot screen and sound.

## Requirements

- A PSP running custom firmware that can load VSH plugins
- **CXMB** enabled for the VSH/XMB
- System software **6.60 or 6.61**
- A Memory Stick or internal storage exposed as `ms0:`

This is a **CTF**, not a normal PTF. It will not work without CXMB.

## Install

1. Check **Settings → System Settings → System Information** and note whether
   the PSP reports 6.60 or 6.61.
2. Download the matching CTF from the table above.
3. Connect the PSP by USB and copy the file to `ms0:/PSP/THEME/`.
4. Confirm CXMB is enabled. A common plugin entry is:
   `ms0:/seplugins/cxmb/cxmb.prx 1`
5. On the PSP, open **Settings → Theme Settings → Theme**, select the theme,
   and apply it.
6. Restart the VSH or reboot the PSP if CXMB does not reload automatically.
7. For the animated background, choose
   **Settings → Theme Settings → Background → Original**.

See [the full install and recovery guide](docs/INSTALL.md) if the theme does not
appear, CXMB falls back to stock, or the PSP boots to a black screen.

## Compatibility

- **Confirmed:** PSP-2000 Slim, motherboard generation 02g, firmware 6.61,
  CXMB. Vertical blades render and the stock font avoids corrupt/foreign glyphs.
- **Expected but not yet hardware-tested here:** other PSP models on matching
  6.60/6.61 firmware with a compatible CXMB setup.
- **ARK-4 note:** upstream reports that ARK-4 r163 or newer may briefly flash a
  white screen after the gameboot while loading an ISO. This is an ARK/CXMB
  behavior, not a permanent display fault.
- **Not supported:** stock firmware without CXMB, or firmware versions other
  than 6.60/6.61.

Read the full [compatibility matrix](docs/COMPATIBILITY.md) before experimenting
on an untested model or firmware.

## Recovery

A bad CTF can hang the VSH at a black screen. It does not normally damage the
PSP. Force the PSP off by holding the power switch for about 10 seconds, then
use your custom firmware's recovery menu to disable CXMB and reboot. On many
setups, hold **R** while powering on to enter recovery.

Never write this theme directly to `flash0:`. CXMB exists so the theme can be
loaded from the Memory Stick and recovered safely.

## What works today

On `Blade_661.ctf`:

- Vertical Xbox 360 blade geometry, confirmed on hardware
- Green Xbox-style background and animation
- Xbox 360 coldboot/gameboot assets included by the upstream theme
- Clean stock 6.61 PSP font with no broken glyphs (deliberately retained)
- Clock and battery remain readable at the top of the screen

On the classic theme:

- The complete period look: blade artwork, category icons, and the styled
  clock and battery rail, all from one consistent 2008-era theme

## Legacy classic theme

`xbox_360_660_classic.ctf` is the original Xbox 360 dashboard theme. It is the
one with **everything**: real blade artwork, icons for every category, and the
Xbox-styled clock and battery rail.

It targets 6.60 and needs two things before it is safe on 6.61:

1. Its magic must be rewritten to `0xDEAD0661` and the header table re-signed.
2. Its legacy font (`/font/LTN0.PGF`) must be dropped, because old PGFs render
   corrupt and foreign-language glyphs on 6.61.

Both are done by the script in this repository:

```sh
python3 scripts/retarget-ctf-for-firmware.py \
    xbox_360_660_classic.ctf xbox_360_661.ctf \
    --target 6.61 --drop /font/LTN0.PGF --firmware-dir firmware
```

If the classic theme's foreground (`system_plugin_fg.rco`) misbehaves on your
firmware, drop it too and the PSP will use its own:

```sh
python3 scripts/retarget-ctf-for-firmware.py in.ctf out.ctf --target 6.61 \
    --drop /font/LTN0.PGF --drop /vsh/resource/system_plugin_fg.rco \
    --firmware-dir firmware
```

## Remaining work

- Confirm the classic theme's blade art, icons, and styled clock on hardware
- Decide whether the classic theme supersedes the modern Blade theme
- Port the Xbox-styled clock onto the modern Blade RCO base
- Only change the font if full 6.61 glyph coverage can be preserved
- Test the final hybrid on additional PSP models and CFW families

Progress and technical notes live in
[`docs/ctf-conversion-findings.md`](docs/ctf-conversion-findings.md).

## Verification

```text
2f24cb6c6ce011c306e4345210709cc673c5521c4d4c42cba4d7afec06fe5bb5  Blade_660.ctf
5fa3152128ed0d4f87ecacdb2bdccb958584adf1d88e452644216a217dc96a50  Blade_661.ctf
880031ed5b58d8d4d9e331314891d22e88ce6f5eb7c98c2f3be642319fb2b533  xbox_360_660_classic.ctf
```

`Blade_660.ctf` and `Blade_661.ctf` are 1,818,578 bytes. The 6.61 build is the
validated conversion of the upstream 6.60 CTF; its CXMB magic is `0xDEAD0661`.

## For developers

The repository also contains CTF extraction/rebuild scripts and notes about
CXMB PRX diff records. Start with [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).
Sony firmware files are intentionally excluded from Git.

## Credits and rights

The Blade theme is by **TheDelm**:
<https://thedelm.itch.io/xbox-blade-psp-theme>

The classic Xbox 360 dashboard theme was originally released for PSP 3.80 M33
and is mirrored on psppunk: <https://www.pspunk.com/psp-cxmb/>

CXMB is maintained by the PSP homebrew community:
<https://github.com/PSP-Archive/CXMB>

Xbox and Xbox 360 are trademarks of Microsoft. This is an unofficial fan
project and is not affiliated with or endorsed by Microsoft or Sony. See
[`ATTRIBUTION.md`](ATTRIBUTION.md) for redistribution and licensing details.
