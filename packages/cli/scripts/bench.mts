// Run: TESSERAI_OFFLINE=1 pnpm --filter @tesserai/cli exec tsx scripts/bench.mts
// A real MCP client and isolated project; no provider calls or user files.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { PRESETS } from '@tesserai/core';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { init } from '../src/init.ts';
import { createMcpServer } from '../src/mcp.ts';

const dir = await mkdtemp(join(tmpdir(), 'tesserai-bench-'));
const client = new Client({ name: 'latency-bench', version: '1.0.0' });
const measurements: Record<string, unknown> = {};
try {
  const project = join(dir, 'app');
  await mkdir(join(project, 'src'), { recursive: true });
  await writeFile(join(project, 'package.json'), JSON.stringify({ devDependencies: { vite: '^8', tailwindcss: '^4' } }));
  await writeFile(join(project, 'tsconfig.json'), JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }));
  const bundle = join(dir, 'bundle.json');
  await writeFile(bundle, JSON.stringify(PRESETS[0]!.build()));
  await init({ dir: project, bundlePath: bundle, install: false, lint: false });
  const startup = performance.now();
  if (process.argv.includes('--stdio')) {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../bin/tesserai.js', import.meta.url)), 'mcp', '--dir', project], stderr: 'pipe', env: { PATH: process.env.PATH!, TESSERAI_OFFLINE: '1' } }));
  } else {
    const [a, b] = InMemoryTransport.createLinkedPair();
    await createMcpServer(project).connect(b);
    await client.connect(a);
  }
  measurements.initialize = { ms: Math.round((performance.now() - startup) * 100) / 100, transport: process.argv.includes('--stdio') ? 'stdio' : 'in-memory' };
  for (const [name, args] of [
    ['outline', {}], ['get_tokens', { prefix: 'color.brand' }],
    ['get_component', { component: 'button' }], ['component_guide', { component: 'button' }],
    ['example_page', { page: 'sign-in' }], ['list_operations', {}],
    ['apply_changes', { preview: true, ops: [{ op: 'radius.set', input: { base: 12 } }] }],
  ] as const) {
    const samples: number[] = [];
    for (let i = 0; i < 21; i++) {
      const start = performance.now();
      const result = await client.callTool({ name, arguments: args });
      if (result.isError) throw new Error(JSON.stringify(result));
      samples.push(performance.now() - start);
    }
    const cold = samples.shift()!;
    samples.sort((a, b) => a - b);
    const round = (n: number) => Math.round(n * 100) / 100;
    measurements[name] = { firstMs: round(cold), medianMs: round(samples[10]!), p95Ms: round(samples[18]!) };
  }
  console.log(JSON.stringify({ node: process.version, platform: process.platform, samples: 20, measurements }, null, 2));
} finally {
  await client.close();
  await rm(dir, { recursive: true, force: true });
}
