const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo so Metro picks up changes in packages/* alongside our app.
config.watchFolders = [workspaceRoot];

// Resolve modules from both the local node_modules (hoisted via .npmrc
// node-linker=hoisted) and the workspace root, so workspace packages like
// @mochilang/translate are findable.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.unstable_enablePackageExports = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const result = context.resolveRequest(context, moduleName, platform);
  if (platform === 'web' && result.type === 'sourceFile' && result.filePath === path.join(workspaceRoot, 'packages/dict/src/data-source.ts')) {
    return { type: 'sourceFile', filePath: path.join(workspaceRoot, 'packages/dict/src/data-source.mochiread.ts') };
  }
  return result;
};

module.exports = config;
