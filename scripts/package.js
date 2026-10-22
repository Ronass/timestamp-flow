/**
 * 一键构建分发包：
 *   1. 校验 package.json 与 neutralino.config.json 版本一致
 *   2. 图标缺失时自动生成
 *   3. neu build 生成产物
 *   4. 复制到 dist/release/TimestampFlow-<version>-<platform>-<arch>/
 *   5. 压缩为同名 zip，并输出 SHA256
 *
 * 用法：npm run dist
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, execSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const config = readJson('neutralino.config.json');
const pkg = readJson('package.json');

if (config.version !== pkg.version) {
  fail(`版本号不一致：package.json=${pkg.version}，neutralino.config.json=${config.version}`);
}

const version = config.version;
const binaryName = config.cli.binaryName;
const platformName = { win32: 'win', darwin: 'mac', linux: 'linux' }[process.platform];
const archName = { x64: 'x64', arm64: 'arm64', ia32: 'x86' }[process.arch] ?? process.arch;

if (!platformName) fail(`不支持的平台：${process.platform}`);

const clientLib = path.join(root, 'resources', 'js', 'neutralino.js');
if (!fs.existsSync(clientLib)) {
  fail('缺少 Neutralino 客户端库（resources/js/neutralino.js），请先运行 npx neu update');
}

const iconPath = path.join(root, 'resources', 'icons', 'appIcon.png');
if (!fs.existsSync(iconPath)) {
  console.log('→ 图标不存在，先生成图标…');
  execFileSync(process.execPath, [path.join(__dirname, 'make-icon.js')], { stdio: 'inherit' });
}

console.log('→ 构建应用资源包…');
execSync('npx neu build', { cwd: root, stdio: 'inherit' });

const distRoot = path.join(root, 'dist', binaryName);
if (!fs.existsSync(distRoot)) fail(`未找到构建目录：${distRoot}`);

const files = fs.readdirSync(distRoot);
const exeName = files.find((name) => name.startsWith(`${binaryName}-${platformName}_${archName}`));
const resourceName = files.includes('resources.neu') ? 'resources.neu' : null;

if (!exeName || !resourceName) {
  fail(`未找到当前平台的构建产物（${platformName}_${archName}），请检查 ${distRoot}`);
}

const releaseRoot = path.join(root, 'dist', 'release');
const folderName = `TimestampFlow-${version}-${platformName}-${archName}`;
const outDir = path.join(releaseRoot, folderName);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const exePath = path.join(outDir, exeName);
const resourcePath = path.join(outDir, resourceName);
fs.copyFileSync(path.join(distRoot, exeName), exePath);
fs.copyFileSync(path.join(distRoot, resourceName), resourcePath);

const zipPath = path.join(releaseRoot, `${folderName}.zip`);
fs.rmSync(zipPath, { force: true });

console.log('→ 压缩分发包…');
if (process.platform === 'win32') {
  const quote = (value) => value.replace(/'/g, "''");
  const script = [
    'Compress-Archive',
    `-LiteralPath '${quote(exePath)}','${quote(resourcePath)}'`,
    `-DestinationPath '${quote(zipPath)}'`,
    '-Force',
  ].join(' ');
  execFileSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'inherit' });
} else {
  try {
    execFileSync('zip', ['-q', '-j', zipPath, exePath, resourcePath], { stdio: 'inherit' });
  } catch {
    fail(`未找到 zip 命令，请手动压缩：${outDir}`);
  }
}

if (!fs.existsSync(zipPath)) fail('压缩失败，未生成 zip 文件');

const mb = (file) => `${(fs.statSync(file).size / 1024 / 1024).toFixed(2)} MB`;
const kb = (file) => `${(fs.statSync(file).size / 1024).toFixed(1)} KB`;
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');

console.log('');
console.log('✓ 构建完成');
console.log(`  版本        ${version}`);
console.log(`  可执行文件  ${exeName} (${mb(exePath)})`);
console.log(`  资源包      ${resourceName} (${kb(resourcePath)})`);
console.log(`  分发包      ${path.relative(root, zipPath)} (${mb(zipPath)})`);
console.log(`  SHA256      ${sha256}`);
console.log('');
console.log(`  解压后两个文件需保持同目录，双击 ${exeName} 运行。`);
