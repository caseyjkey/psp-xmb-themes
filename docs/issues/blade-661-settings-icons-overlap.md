# Blade 6.61: Settings submenu icons overlap labels

## Known-good baseline

The PSP is currently configured to load `PSP/THEME/blade/Blade_661.ctf`.
This is the known-good baseline: the Blade theme renders and is usable, aside
from the Settings submenu icon/label overlap described below. The committed
artifact is `themes/Blade_661.ctf` (1,818,578 bytes), SHA-256:

```text
5fa3152128ed0d4f87ecacdb2bdccb958584adf1d88e452644216a217dc96a50
```

No replacement or layout modification is included in this build. Keep it as a
fallback when testing any future fix.

## Issue

In the Settings submenu, icons render on top of menu text. Other observed
parts of the active theme are considered good. The precise affected rows,
firmware/CFW combination, and visual measurements have not yet been recorded.

## Investigation notes

- Do not replace the whole `sysconf_plugin.rco` from another theme as a fix:
  that risks changing the Blade theme's artwork and layout.
- Investigate the Settings submenu resource's icon and label geometry in the
  Blade 6.61 build and its source lineage. Prefer a narrow, separately named
  probe that leaves this baseline and active CXMB configuration untouched.
- Confirm any proposed fix visually on the PSP before describing the issue as
  resolved.
