import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const node = process.execPath;

async function run(script, args) {
  return execFileAsync(node, [path.join(root, "scripts", script), ...args], {
    cwd: root,
  });
}

test("extract preserves PRX diff blobs, not only their record counts", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "ctf-extract-test-"));
  const input = path.join(root, "themes", "Blade_661.ctf");

  await run("ctf-extract.mjs", [input, temp]);

  assert.equal((await stat(path.join(temp, "vsh/module/vshmain.prx"))).size, 2446);
  assert.equal((await stat(path.join(temp, "vsh/module/paf.prx"))).size, 324);
});

test("replacing a raw resource with identical bytes is byte-exact", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "ctf-replace-test-"));
  const extracted = path.join(temp, "extracted");
  const input = path.join(root, "themes", "Blade_661.ctf");
  const output = path.join(temp, "roundtrip.ctf");

  await run("ctf-extract.mjs", [input, extracted]);
  await run("ctf-replace.mjs", [
    input,
    output,
    `/vsh/resource/topmenu_icon.rco=${path.join(extracted, "vsh/resource/topmenu_icon.rco")}`,
  ]);

  assert.deepEqual(await readFile(output), await readFile(input));
});

test("keeping diff resources preserves every record", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "ctf-keep-test-"));
  const input = path.join(root, "themes", "Blade_661.ctf");
  const output = path.join(temp, "kept.ctf");

  await run("ctf-keep.mjs", [
    input,
    output,
    "/vsh/module/vshmain.prx",
    "/vsh/module/paf.prx",
    "/vsh/resource/topmenu_icon.rco",
  ]);
  const { stdout } = await run("ctf-diff-dump.mjs", [
    output,
    "/vsh/module/vshmain.prx",
    "/vsh/module/paf.prx",
  ]);

  assert.match(stdout, /vshmain\.prx: 159 record\(s\), 2446 data bytes/);
  assert.match(stdout, /paf\.prx: 25 record\(s\), 324 data bytes/);
});
