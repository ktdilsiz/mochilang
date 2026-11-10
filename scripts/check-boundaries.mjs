import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const failures = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.expo'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!/\.(?:[cm]?[jt]sx?)$/.test(file)) continue;
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*|require\s*\()(['"])([^'"]+)\1/g)) {
      const specifier = match[2];
      const resolved = specifier.startsWith('.') ? path.relative(root, path.resolve(path.dirname(file), specifier)).replaceAll('\\', '/') : specifier;
      const fail = (reason) => failures.push(`${relative}: ${specifier}: ${reason}`);
      if (relative.startsWith('packages/') && resolved.startsWith('apps/')) fail('packages cannot import applications');
      if (relative.startsWith('apps/') && specifier.startsWith('.') && resolved.startsWith('packages/')) fail('use a package export');
      if (relative.startsWith('apps/mochiread/src/storage/') && /src\/(features|app)\//.test(resolved)) fail('storage cannot depend on feature or app code');
      if (relative.startsWith('apps/mochiread/src/') && specifier === '@mochilang/dict' && relative !== 'apps/mochiread/src/platform/dictionaries/index.ts') fail('runtime uses dict/core; bundled data belongs in the native adapter');
      if (specifier === '@mochilang/shared' || resolved.startsWith('packages/shared')) fail('use @mochilang/core');
    }
  }
}
await visit(path.join(root, 'apps'));
await visit(path.join(root, 'packages'));
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Package and MochiRead storage boundaries passed.');
