# PSP-1000 recovery card and Baryon Sweeper notes

This guide records the hardware and recovery sequence that successfully restored
the project's PSP-1000 to **6.61 ARK-4 cIPL**. It is specific to the tested
ESP8266 NodeMCU USB-UART setup.

## Keep a dedicated recovery Memory Stick

A smaller Memory Stick or microSD adapter can be kept as the dedicated DC-ARK
recovery card. The large everyday card can then hold themes, plugins, games, and
media without carrying the visible DC-ARK installer files.

Do not create the replacement by copying files alone. A Magic Memory Stick also
contains boot data written outside the visible filesystem.

### Build the replacement card

1. Leave the currently working recovery card unchanged.
2. Insert the replacement card and format it with the PSP.
3. Use the same official ARK-4 release that produced the working card.
4. Copy `ARK_DC` to `ms0:/PSP/GAME/ARK_DC/`.
5. Copy the official Sony 6.61 updater to `ms0:/661.PBP`.
6. Boot the PSP normally under ARK cIPL and run the DC-ARK installer from the
   Game menu.
7. Follow the installer prompts to create the Magic Memory Stick. This writes
   both the visible DC-ARK files and the required Memory Stick IPL.

The official alternative is ARK-4's PC `MagicMemoryCreator`, run as
administrator/root. The PSP-side installer is the simpler route now that this
PSP boots ARK normally.

### Prove the replacement before cleaning the large card

1. Shut the PSP completely down.
2. Insert the replacement recovery card.
3. Start Baryon Sweeper in `Service / FFFFFFFF` mode.
4. Use the proven three-lead connection below to enter the DC-ARK menu.
5. Select **Boot 6.61 ARK from MemoryStick** first. This is the non-flashing
   validation path.
6. Require a responsive XMB before treating the replacement card as proven.

Only after that test succeeds should the original large card be backed up and
its recovery-only files removed. Do not remove `PSP/SAVEDATA/ARK_01234`, theme
files, or `SEPLUGINS` merely because they mention ARK; they can be part of the
normal CFW/theme setup. Recovery-only candidates include `TM/DCARK/`,
`PSP/GAME/ARK_DC/`, and the root `661.PBP`, but inventory and back up the card
before deleting anything. A raw Memory Stick IPL left on the everyday card is
harmless.

## Proven NodeMCU one-wire UART wiring

Power off and disconnect USB before changing the breadboard.

- Hold the NodeMCU's ESP8266 inactive with `EN -> GND`; leave `RST`
  disconnected.
- Use one shared K-line junction containing NodeMCU `RX`, PSP middle `K`, the
  diode's **banded end**, and one end of the 10 kOhm pull-up resistor.
- Connect the diode's **unbanded end** to NodeMCU `TX`.
- Connect the resistor's other end to NodeMCU `3V3`.
- Connect PSP battery-terminal negative (`-`) to NodeMCU `GND`.
- Connect PSP battery-terminal positive (`+`) briefly to NodeMCU `3V3` as the
  third lead/battery-presence voltage.
- Keep the PSP barrel charger connected so the NodeMCU regulator is not asked
  to power the console.
- Never connect PSP battery-terminal positive to NodeMCU `VIN` or USB `5V`.

The working physical build required the diode band toward the shared K-line,
not toward TX. Preserve that orientation. If rebuilding with different parts,
prove the direct TX-to-RX loopback and then the complete diode-path echo before
touching the PSP.

## Proven service-boot sequence

1. Insert the verified DC-ARK Magic Memory Stick.
2. Connect the PSP barrel charger.
3. Start the Baryon logger on the correct COM port with
   `Service / FFFFFFFF`.
4. Hold all three PSP probes on `-`, `K`, and `+` without bridging adjacent
   contacts.
5. Flick the PSP power switch once while maintaining contact.
6. Keep the logger running through authentication and boot.

A valid exchange begins like this:

```text
5A 02 01 A2
A5 05 06 10C306 76
5A 02 0C 97
A5 06 06 FFFFFFFF 52
```

Successful recovery also completed the `80` and `81` authentication challenge
packets. Continuous `00`, `FF`, or `FE` bytes are noise, not a valid exchange.

In the DC-ARK menu, first use **Boot 6.61 ARK from MemoryStick** to prove the
non-flashing path. For this PSP-1000, the subsequent **Install 6.61 ARK**
completed successfully and normal reboot reported **6.61 ARK-4 cIPL**.

## Preserve the recovery kit

Keep the dedicated recovery card, the working Baryon breadboard, and a photo of
the wiring together. Label the diode orientation and all three PSP contacts.
That is substantially safer than reconstructing the circuit during a future
brick recovery.
