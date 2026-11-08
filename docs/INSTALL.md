# Installation and recovery

## Pick the correct file

On the PSP, open **Settings → System Settings → System Information**.

- System Software **6.61**: use `Blade_661.ctf`
- System Software **6.60**: use `Blade_660.ctf`
- Any other version: stop. This repository does not provide a matching build.

The PSP model does not choose the file. The system software version does.

## Install CXMB

This theme requires CXMB. Follow the CXMB guide for your custom firmware:
<https://www.pspunk.com/psp-cxmb/>

The usual plugin line is:

```text
ms0:/seplugins/cxmb/cxmb.prx 1
```

It normally belongs in `ms0:/seplugins/vsh.txt`. Some CXMB packages use a
different plugin path; keep the path supplied by that package.

## Install the theme

1. Connect the PSP in USB mode.
2. Copy the matching CTF to `ms0:/PSP/THEME/`.
3. Safely disconnect USB.
4. Open **Settings → Theme Settings → Theme**.
5. Select the Blade theme and apply it.
6. Restart VSH from the custom firmware menu, or reboot the PSP.
7. Select **Theme Settings → Background → Original** for the animated
   background.

## If the theme does not appear

1. Confirm the extension is `.ctf`, not `.ctf.zip`.
2. Confirm the file is directly under `PSP/THEME/`.
3. Confirm CXMB is enabled in the VSH plugin list.
4. Confirm the CTF firmware version matches System Information.
5. Restart VSH or reboot after changing plugin settings.

## If it looks stock

CXMB can silently reject an incompatible resource and fall back to the stock
XMB. The wallpaper may remain even when the rest of the CTF was rejected.

Disable the theme, verify the matching build was used, and test again. If the
stock fallback happens on a model/CFW combination not listed as confirmed,
please open an issue with:

- PSP model (1000/2000/3000/Go/Street)
- motherboard generation if known (01g/02g/03g/etc.)
- system software version
- custom firmware and version
- CXMB version/source
- exact symptom and whether the wallpaper remained

## Black-screen recovery

1. Hold the power switch up for about 10 seconds to force the PSP completely
   off.
2. Open your custom firmware recovery menu. On many CFW setups, hold **R** while
   powering on.
3. Disable `cxmb.prx` under Plugins, or disable all VSH plugins temporarily.
4. Reboot.
5. Remove or replace the CTF before re-enabling CXMB.

If your CFW uses a different recovery key or menu, follow its documentation.
Do not write theme resources to `flash0:`.

## Advanced: direct CXMB configuration

Some CXMB builds accept a theme path in `ms0:/seplugins/cxmb/conf.txt`:

```text
/PSP/THEME/Blade_661.ctf
ms0
```

This is useful when a CTF does not appear in Theme Settings, but it is not the
preferred first-time installation method. The exact config format varies by
CXMB build.

