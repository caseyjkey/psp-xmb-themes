#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2] ?? "work/builds/xbox_360_safe.ctf";
const outputDir = process.argv[3] ?? "work/builds/matrix";
const keepScript = path.join(path.dirname(new URL(import.meta.url).pathname), "ctf-keep.mjs");
const wallpaper = ["/vsh/resource/01-12.BMP", "/vsh/resource/01-12_03g.bmp"];
const tests = [
  ["wallpaper_only", []],
  ["topmenu_icon", ["/vsh/resource/topmenu_icon.rco"]],
  ["system_fg", ["/vsh/resource/system_plugin_fg.rco", "/vsh/resource/system_plugin_fg0.rco"]],
  ["sysconf", ["/vsh/resource/sysconf_plugin.rco"]],
  ["game", ["/vsh/resource/game_plugin.rco"]],
  ["impose", ["/vsh/resource/impose_plugin.rco"]],
  ["msvideo", ["/vsh/resource/msvideo_main_plugin.rco"]],
  ["music_browser", ["/vsh/resource/music_browser_plugin.rco"]],
  ["music_player", ["/vsh/resource/music_player_plugin.rco"]],
  ["photo_browser", ["/vsh/resource/photo_browser_plugin.rco"]],
  ["savedata", ["/vsh/resource/savedata_plugin.rco"]],
  ["visualizer", ["/vsh/resource/visualizer_plugin.rco"]],
];

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
  });
}

await mkdir(outputDir, { recursive: true });
for (const [name, resources] of tests) {
  const output = path.join(outputDir, `xbox_360_${name}.ctf`);
  await run([keepScript, input, output, ...resources, ...wallpaper]);
}
