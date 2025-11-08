// Runs multiple Deno scripts concurrently with live output (modern Deno-compatible)

import { readableStreamFromReader } from "https://deno.land/std@0.224.0/streams/mod.ts";

const commands = [
  {
    name: "STATE",
    cmd: [
      "deno",
      "run",
      "--no-lock",
      "--allow-net",
      "--allow-env",
      "--allow-read",
      "./supabase/functions/import-ap-state-results/schedule.ts",
    ],
  },
  {
    name: "COUNTY",
    cmd: [
      "deno",
      "run",
      "--no-lock",
      "--allow-net",
      "--allow-env",
      "--allow-read",
      "./supabase/functions/import-ap-county-results/schedule.ts",
    ],
  },
  {
    name: "HOUSE",
    cmd: [
      "deno",
      "run",
      "--no-lock",
      "--allow-net",
      "--allow-env",
      "--allow-read",
      "./supabase/functions/import-ap-house-results/schedule.ts",
    ],
  },
  {
    name: "BOP",
    cmd: [
      "deno",
      "run",
      "--no-lock",
      "--allow-net",
      "--allow-env",
      "--allow-read",
      "./supabase/functions/import-ap-bop/schedule.ts",
    ],
  },
];

async function streamOutput(stream: ReadableStream<Uint8Array> | null, prefix: string) {
  if (!stream) return;
  const decoder = new TextDecoder();
  for await (const chunk of stream) {
    const text = decoder.decode(chunk).trimEnd();
    if (text.length) console.log(`[${prefix}] ${text}`);
  }
}

async function runCommand({ name, cmd }: { name: string; cmd: string[] }) {
  console.log(`🚀 Starting ${name}...\n`);

  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  // Stream stdout and stderr concurrently
  streamOutput(process.stdout, name);
  streamOutput(process.stderr, `${name} ERROR`);

  const status = await process.status;
  console.log(`\n${name} exited with code ${status.code}\n`);
}

for (const cmd of commands) {
  runCommand(cmd);
}

console.log("\n🚀 Running all tasks concurrently — press Ctrl+C to stop.\n");
