# Compatibility

## Hardware and firmware matrix

| PSP / firmware | Build | Result |
|---|---|---|
| PSP-2000 Slim (02g), 6.61 + CXMB | `Blade_661.ctf` | **Confirmed on hardware:** vertical blades work |
| Any PSP, 6.60 + compatible CXMB | `Blade_660.ctf` | Upstream target; not independently hardware-tested in this repo |
| PSP-1000 / 3000 / Go / Street, 6.61 | `Blade_661.ctf` | Untested; reports welcome |
| Firmware other than 6.60 or 6.61 | None | Unsupported; do not rename or force-load a CTF |
| Stock firmware without CXMB | None | Unsupported |

## Confirmed 6.61 behavior

On the tested PSP-2000 Slim (02g):

- vertical blades render correctly;
- the clock and battery are readable in the stock PSP style at the top;
- the stock font renders cleanly without corrupt or foreign glyphs;
- the milestone build does not yet show custom icons for every menu option.

## Why the 6.61 conversion is considered safe

The upstream 6.60 theme contains 159 `vshmain.prx` and 25 `paf.prx` patch
records. Clean 6.60 and 6.61 firmware differ by only three relevant bytes in
those modules: one byte in `paf.prx` and two in `vshmain.prx`.

All 184 theme records were checked and none overlap those differing bytes. The
converted file then received the 6.61 CXMB magic (`0xDEAD0661`) and a rebuilt
header signature. Real-hardware testing confirmed the vertical layout boots.

This validation does not make arbitrary 6.60 CTF files safe on 6.61. It applies
to this exact build and checksum.

## CFW notes

The exact CFW family on the confirmed PSP was not recorded, so compatibility is
stated at the firmware + CXMB level rather than claiming PRO, ME, or ARK support
that has not been proved.

The upstream author notes that ARK-4 r163 or newer may briefly flash white after
the gameboot while an ISO loads. See:
<https://github.com/PSP-Archive/ARK-4/issues/682>

## Reporting a result

Open a GitHub issue with the PSP model, motherboard generation if known,
firmware, CFW, CXMB source/version, selected build checksum, and result. Both
success and failure reports improve this matrix.

