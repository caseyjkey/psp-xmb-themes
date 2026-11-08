# Development notes

The public theme files are under `themes/`. Root-level CTF files and the longer
research logs are retained as comparison material from earlier experiments.

## Repository layout

| Path | Purpose |
|---|---|
| `themes/` | User-facing installable CTF builds |
| `scripts/` | CTF inspection, extraction, filtering, rebuilding, and PRX analysis |
| `docs/` | Installation, compatibility, recovery, and reverse-engineering notes |
| `CXMB/` | Upstream CXMB submodule used to understand CTF/diff semantics |
| `firmware/` | Local extracted firmware, ignored and never distributed |
| `work/` | Local scratch builds, ignored |

## CTF format summary

A CXMB CTF is a PTF payload followed by a resource table. Resources can be raw
RCO/BMP/PMF files or PRX patch-record lists. For patched PRX modules, CXMB writes
`(runtime offset, size, bytes)` records into the loaded module.

Firmware magic at offset `0x10`:

- 6.60: `0xDEAD0660`
- 6.61: `0xDEAD0661`

For the modules used by this theme, runtime offsets map to file offsets using:

- `vshmain.prx`: file offset = runtime offset + `0xa0`
- `paf.prx`: file offset = runtime offset + `0xc0`

## Useful scripts

| Script | Purpose |
|---|---|
| `ctf-inventory.mjs` | Summarize firmware tag, resources, and risky entries |
| `ctf-diff-dump.mjs` | Print PRX diff records from a CTF |
| `ctf-extract.mjs` | Extract CTF resources |
| `ctf-keep.mjs` | Rebuild a CTF with selected resources |
| `ctf-replace.mjs` | Replace or add CTF resources |
| `ctf-diff-subset.mjs` | Keep selected patch records from one resource |
| `ctf-to-661.py` | Convert the CXMB firmware magic and header signature to 6.61 |
| `validate-ctf-for-firmware.py` | Check records against clean 6.60/6.61 modules |
| `build-settings-reorder.py` | Build the experimental Settings reorder patch |

The firmware-dependent scripts require locally extracted Sony firmware files.
Those files are intentionally excluded for copyright and size reasons.

Run the CTF round-trip regression tests with:

```sh
node --test tests/ctf-tools.test.mjs
```

CTF PRX table entries store a **record count**, not a byte length. The rebuild
tools therefore copy each resource through the next table offset. Never slice a
`vshmain.prx` or `paf.prx` entry using its header `size` field as bytes.

## Current porting direction

The Blade CTF supplies the correct `vshmain.prx` + `paf.prx` geometry but little
menu art. The next hybrid build keeps that working geometry while selectively
adding compatible `topmenu_icon.rco`, font, and foreground resources.

The foreground must be rebuilt on a clean 6.61 `system_plugin_fg.rco` object
tree. Raw legacy foreground RCO replacement makes CXMB fall back to stock.
Clock text edits are known safe; battery image-reference swaps are not.

See [`ctf-conversion-findings.md`](ctf-conversion-findings.md) for the full
experiment log.

