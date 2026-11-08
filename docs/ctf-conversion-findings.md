# PSP CTF Conversion Findings

Target hardware: PSP-3000 02g on 6.61 PRO-C with CXMB.

Primary target theme: `psp_target_xbox_360.660.ctf`

## Current Working Baseline

Known working build:

`/PSP/THEME/xbox_target_visual/target_boot_661icons.ctf`

Observed behavior:

- Custom Xbox boot returns.
- Correct green Xbox 360 wallpaper appears.
- Custom top-level menu bar art appears.
- Menu bars are still horizontal, but the art would look correct if vertical.
- Original Xbox-styled top toolbar/battery indicator is not present.

This build combines:

- Original target boot resources:
  - `/vsh/module/opening_plugin.prx`
  - `/vsh/resource/opening_plugin.rco`
  - `/vsh/resource/GAMEBOOT.PMF`
- Original target wallpaper/background resources:
  - `/vsh/resource/01-12.BMP`
  - `/vsh/resource/01-12_03g.bmp`
  - `/vsh/resource/system_plugin_bg.rco`
- 6.61-safe menu art from `xbox_363.661.ctf`:
  - `/vsh/resource/topmenu_icon.rco`

## Confirmed Incompatible Raw Resources

These resources caused CXMB to fall back to stock/PTF-only behavior when added to the working baseline:

- Original target `/vsh/resource/system_plugin_fg.rco`
- Original target `/vsh/resource/system_plugin_fg0.rco`

Observed fallback symptoms:

- No custom boot.
- No custom menu bars/icons.
- Stock toolbar and stock battery indicator.
- Only the custom wallpaper remains.

Current interpretation: these foreground RCOs are not safe to copy raw from the 6.60 theme into a 6.61 CXMB build. They likely need to be rebuilt/ported against a 6.61-compatible RCO structure.

## Vertical Menu Work

Tested:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_0.ctf`

This build uses the known-working boot+wallpaper+icons baseline and adds only original target PAF diff record `0`.

Observed behavior:

- Custom boot works.
- Wallpaper works.
- Clock/date/battery remain stock.
- No styled topbar.
- Top-level menu bars remain horizontal.
- The Extras section does not show the expected Xbox 360 blade/slice.

Conclusion: original target PAF record `0` is boot-safe, but it is not sufficient to restore the vertical menu or blade/slice layout.

Next planned vertical-layout test:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_1_4.ctf`

Tested:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_1_4.ctf`

Observed behavior:

- No custom boot.
- No custom menu bars/icons.
- Toolbar, clock/date, and battery remain stock.
- Wallpaper remains.

Conclusion: original target PAF records `1-4` are incompatible in this build. They cause CXMB to fall back to stock/PTF-only behavior.

Tested:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_5_7.ctf`

Observed behavior:

- Custom boot and working visual baseline remain stable.
- No obvious menu orientation change.
- No Extras blade/slice restored.
- Topbar/battery remains stock.

Conclusion: original target PAF records `5-7` are boot-safe but visually insufficient by themselves.

Tested:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_8_10.ctf`

Observed behavior:

- Custom boot and working visual baseline remain stable.
- No visible menu orientation, scale, or blade/slice change.
- Topbar/battery remains stock.

Conclusion: original target PAF records `8-10` are boot-safe but visually insufficient by themselves.

Tested:

`/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_11_17.ctf`

Observed behavior:

- Custom boot and working visual baseline remain stable.
- No clear menu orientation or blade/slice restoration.
- Possible minor label-position difference: labels may appear above the menu section icon.
- Topbar/battery remains stock.

Conclusion: original target PAF records `11-17` are boot-safe but visually insufficient by themselves.

Safe PAF groups so far:

- `0`
- `5-7`
- `8-10`
- `11-17`

Known-bad PAF group:

- `1-4`

Next step: test combinations of only the safe PAF groups. If those do not restore the vertical menu, the vertical blade layout is probably controlled by `vshmain.prx` diff records and/or `topmenu_plugin.rco` layout/script data rather than PAF alone.

Tested:

`/PSP/THEME/xbox_target_boot_paf_combo/target_boot_icons_paf_0_5_7.ctf`

Observed behavior:

- Custom boot and working visual baseline remain stable.
- Top menu labels are below the icon.
- No menu orientation change.
- No blade/slice restoration.

Conclusion: combined safe PAF records `0,5-7` are boot-safe but visually insufficient.

Tested:

`/PSP/THEME/xbox_target_boot_paf_combo/target_boot_icons_paf_0_8_10.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: combined PAF records `0,8-10` are incompatible in this build. Although records `0` and `8-10` were each boot-safe alone, their combination causes CXMB fallback.

## VSHMAIN Layout Work

Because isolated and combined PAF tests did not restore the vertical blade layout, the next phase is testing original target `/vsh/module/vshmain.prx` diff records individually on top of the known-working boot+wallpaper+icons baseline.

Original target `vshmain.prx` has 17 diff records:

- `0`: offset `0xffffff60`, bytes `0c 00`
- `1`: offset `0x00007678`, bytes `76 c3`
- `2`: offset `0x00007f8c`, bytes `76 c3`
- `3`: offset `0x0001d824`, bytes `76`
- `4`: offset `0x0001d944`, bytes `9e`
- `5`: offset `0x0001da64`, bytes `c0`
- `6`: offset `0x0001dbec`, bytes `ce`
- `7`: offset `0x0001dd08`, bytes `76`
- `8`: offset `0x0001dd78`, bytes `9e`
- `9`: offset `0x0001ddd4`, bytes `ce`
- `10`: offset `0x0001dde8`, bytes `e2`
- `11`: offset `0x0001de04`, bytes `d0`
- `12`: offset `0x0001de09`, bytes `00`
- `13`: offset `0x0002ef04`, bytes `00 00`
- `14`: offset `0x0002ef24`, bytes `00 00`
- `15`: offset `0x0002effd`, bytes `3f`
- `16`: offset `0x00031108`, bytes `1b`

Current active VSHMAIN test:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r1.ctf`

Record `0` is being skipped initially because its offset is unusual and should be handled after safer records are characterized.

Tested:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r1.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: original target VSHMAIN record `1` is incompatible by itself in this build and causes CXMB fallback.

Tested:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r2.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: original target VSHMAIN record `2` is incompatible by itself in this build and causes CXMB fallback.

Tested:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r3.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: original target VSHMAIN record `3` is incompatible by itself in this build and causes CXMB fallback.

Tested:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r4.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: original target VSHMAIN record `4` is incompatible by itself in this build and causes CXMB fallback.

Tested:

`/PSP/THEME/xbox_target_boot_vshmain/target_boot_icons_vshmain_r5.ctf`

Observed behavior:

- Styling is lost.
- Theme appears stock except for wallpaper.

Conclusion: original target VSHMAIN record `5` is incompatible by itself in this build and causes CXMB fallback.

Interim VSHMAIN conclusion:

Records `1-5` all cause CXMB fallback individually. Stop testing raw VSHMAIN records sequentially for now. The next step should be patch-target analysis/rebasing: identify what clean 6.60 code/data each original record expected, compare that against clean 6.61 modules, and only generate new records where the target bytes and surrounding code match safely.

Original target `/vsh/module/paf.prx` has 18 diff records. Initial analysis shows many are float/coordinate constants, so they are likely responsible for XMB position, spacing, scale, and vertical layout.

Target PAF test builds generated:

- `target_boot_icons_paf_0.ctf`
- `target_boot_icons_paf_1_4.ctf`
- `target_boot_icons_paf_0_4.ctf`
- `target_boot_icons_paf_5_7.ctf`
- `target_boot_icons_paf_8_10.ctf`
- `target_boot_icons_paf_11_17.ctf`
- `target_boot_icons_paf_0_5_7.ctf`
- `target_boot_icons_paf_0_7.ctf`
- `target_boot_icons_paf_0_10.ctf`

## Process Notes

Do not assume `660` or `661` in the filename means the theme is directly compatible with PSP-3000 02g on 6.61 PRO-C. The CTF may still contain RCOs or PRX byte patches that are unsafe on this model/firmware/plugin combination.

Recommended conversion order for each theme:

1. Extract and inventory the CTF.
2. Build a wallpaper-only baseline.
3. Add boot resources and confirm boot behavior.
4. Add menu art/icons from a compatible source or rebuilt RCO.
5. Test foreground/topbar RCOs individually.
6. Add PRX diff records in small groups, starting with PAF layout records.
7. Only after PAF is stable, test VSHMAIN records in very small groups or individual records.

## Useful Local Scripts

- `scripts/ctf-inventory.mjs`: summarize CTF firmware tag, resources, and risk count.
- `scripts/ctf-extract.mjs`: extract CTF resources and `base.ptf`.
- `scripts/ctf-keep.mjs`: create a CTF containing only selected resources.
- `scripts/ctf-replace.mjs`: replace or add a resource inside a CTF.
- `scripts/ctf-diff-dump.mjs`: decode CXMB PRX diff records.
- `scripts/prx-diff-report.py`: map PRX diff offsets to clean firmware modules and disassemble context.
- `scripts/ctf-diff-subset.mjs`: build a CTF with only selected PRX diff records.

## PSP Test Loop

When the PSP is mounted as `D:`, active CXMB theme is set by editing:

`D:\seplugins\cxmb\conf.txt`

Example content:

```text
/PSP/THEME/xbox_target_boot_paf/target_boot_icons_paf_0.ctf
ms0
```

Then reload on the PSP with:

`Select -> Reset VSH`

The PSP commonly disconnects from USB after VSH reset or crash. Reconnect USB mode before changing the next test.

## Deep Research Results Applied Locally

Research conclusion: `system_plugin_fg.rco` owns the foreground/status layer, including battery and clock/date styling. Vertical Xbox blade geometry is more likely in `vshmain.prx` and/or `paf.prx`, while `topmenu_icon.rco` supplies the art.

Local verification:

- Clean 6.60 and 6.61 resource MD5s are identical for:
  - `system_plugin_fg.rco`: `197e1b1094e782c9cfee6a46ef911c01`
  - `topmenu_icon.rco`: `042c815116182ca04b671d7cd67bb8ea`
  - `topmenu_plugin.rco`: `872bdf93cc037784f0e1c6b8074980c1`
  - `system_plugin.rco`: `ea3616f8c30c1500cab7bb8f3ead3cec`
- Therefore the original Xbox foreground failure is not a generic 6.60-vs-6.61 problem.
- The failing original Xbox foreground files differ substantially:
  - `work/fg_port/old_xbox/system_plugin_fg.rco`: size `18740`, MD5 `82cac2b0f3557ea1ae05b45bf03b7b81`
  - `work/fg_port/old_xbox/system_plugin_fg0.rco`: size `46536`, MD5 `001a30efa22c86234c8c2ddaf20a2cd2`
  - Clean 6.61 `system_plugin_fg.rco`: size `34336`, MD5 `197e1b1094e782c9cfee6a46ef911c01`
- Strings in the old Xbox foreground files confirm useful source object/resource labels:
  - `tex_battery`
  - `tex_battery_shadow`
  - `tex_infobar`
  - `page_indicator`
  - `battery_shadow`
  - `battery`
  - `clock`
  - `anim_battery_charging`
  - `anim_battery_not_charging`

Tooling state:

- `RCOMage/` source is present at commit `f5f01cf`.
- RCOMage now builds locally after installing autotools/libxml dependencies.
- Binary: `RCOMage/src/rcomage`.
- RCOMage can dump the old Xbox foreground files because they are uncompressed.
- RCOMage cannot directly dump clean 6.61 `system_plugin_fg.rco` because it is RLZ-compressed; Resurssiklunssi or another RLZ conversion step is still needed for a true clean-base XML port.

Foreground port workspace:

- Clean base: `work/fg_port/clean_661/system_plugin_fg.rco`
- Old Xbox source: `work/fg_port/old_xbox/system_plugin_fg.rco`
- Old Xbox alternate/legacy source: `work/fg_port/old_xbox/system_plugin_fg0.rco`
- Hash notes: `work/fg_port/notes/md5.txt`

Current foreground strategy:

1. Convert clean 6.61 `system_plugin_fg.rco` to editable form.
2. Convert old Xbox `system_plugin_fg.rco` and `system_plugin_fg0.rco` to editable form.
3. Dump all three with RCOMage.
4. Preserve the clean 6.61 object tree.
5. Import only Xbox image assets and targeted object attributes for battery/topbar/clock.
6. Test rebuilt foreground alone before adding PRX layout patches.

Additional foreground finding:

- Old Xbox `system_plugin_fg0.rco` is not a stock 6.61 path, but its header offsets match the clean 6.61 foreground more closely than the smaller old `system_plugin_fg.rco`.
- `system_plugin_fg0.xml` has sane battery coordinates:
  - `battery_shadow`: `posX=225`, `posY=122`, `width=44`, `height=16`
  - `battery`: `posX=223`, `posY=124`, `width=44`, `height=16`
  - `clock`: `posX=203`, `posY=123`, `size=7.6`
- The smaller old `system_plugin_fg.rco` has suspicious/scaled battery values:
  - `battery`: `posX=0`, `posY=0`, `width=226`, `height=128`, `scaleWidth=2.125`, `scaleHeight=2.125`
- New active test uses old `system_plugin_fg0.rco` as the real foreground replacement path:
  - `/PSP/THEME/xbox_fg_port/target_boot_icons_fg0_as_fg.ctf`

Test result:

- `target_boot_icons_fg0_as_fg.ctf` keeps custom boot, custom menu bars, and custom icons.
- No styled topbar or battery appears.
- Conclusion: old `system_plugin_fg0.rco` is safe under the real `system_plugin_fg.rco` path, but the expected visual styling is either not active on the XMB page being observed or looks too similar to stock.

Current foreground probe:

- `/PSP/THEME/xbox_fg_port/target_boot_icons_fg0_probe.ctf`
- Built from recompiled `system_plugin_fg0.xml`.
- Probe changes:
  - move `battery` and `battery_shadow` to negative X/Y coordinates
  - scale battery planes to `2`
  - move `clock` to negative X/Y coordinates
  - make clock/battery red/large
- Purpose: prove whether the replacement foreground RCO's `page_indicator` objects are active on 6.61.

Test result:

- `target_boot_icons_fg0_probe.ctf` shows huge red date/time.
- Battery is not visible.

Conclusion:

- The replacement foreground RCO is loaded.
- The `clock` object under `page_indicator` is active on 6.61.
- The battery object still needs separate isolation. Possible causes:
  - `tex_battery` is visually transparent or not the expected image.
  - battery plane coordinates are still offscreen.
  - battery visibility is controlled by charging/not-charging animations or native events differently from the clock.

Next probe should make the battery plane use an obviously visible image such as `tex_infobar`, placed near the visibly active clock coordinates.

Tested:

- `/PSP/THEME/xbox_fg_port/target_boot_icons_fg0_battery_probe.ctf`

Probe details:

- Recompiled `system_plugin_fg0.xml`.
- Replaced `battery` and `battery_shadow` image references with `image:tex_infobar`.
- Enlarged battery planes to `220x28`.
- Kept a visible red clock near the same area.

Observed behavior:

- Theme falls back to stock.

Conclusion:

- This probe is invalid. Do not use `tex_infobar` as a substitute battery plane image.
- The failure suggests the battery plane/resource relationship is more constrained than the clock text object. Next battery test should keep the original `tex_battery` and `tex_battery_shadow` image references and only change coordinates, scale, and color.

Tested:

- `/PSP/THEME/xbox_fg_port/target_boot_icons_fg0_battery_only_probe.ctf`

Probe details:

- Recompiled `system_plugin_fg0.xml`.
- Kept original `tex_battery` and `tex_battery_shadow` image references.
- Restored clock/date to normal styling.
- Moved battery planes toward screen center and scaled them to `4`.

Observed behavior:

- Theme falls back to stock.

Conclusion:

- Large battery coordinate/scale edits are unsafe.
- Clock/date text edits are confirmed active and safe in `system_plugin_fg0_probe`.
- Battery edits must be tested one attribute at a time from the safe `system_plugin_fg0` base, starting with very small changes or visibility animation changes.
- Avoid changing the battery image reference or applying large battery scale values.
