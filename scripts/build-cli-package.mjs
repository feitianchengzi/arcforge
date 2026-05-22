import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(rootDir, "package.json");
const releaseDir = path.join(rootDir, "release");
const cliWorkDir = path.join(releaseDir, "cli-work");
const cliRoot = path.join(cliWorkDir, "skillops-cli");
const assetsDir = path.join(releaseDir, "cli-assets");
const pkg = JSON.parse(await readFile(packagePath, "utf8"));
const options = parseArgs(process.argv.slice(2));
const repo = options.repo ?? "owner/skillops";
const version = options.version ?? pkg.version;

await assertBuilt();
await rm(cliWorkDir, { recursive: true, force: true });
await rm(assetsDir, { recursive: true, force: true });
await mkdir(path.join(cliRoot, "bin"), { recursive: true });
await mkdir(assetsDir, { recursive: true });

for (const dir of ["cli", "commands", "core", "shared"]) {
  await cp(path.join(rootDir, "dist", dir), path.join(cliRoot, "dist", dir), { recursive: true });
}

await cp(path.join(rootDir, "README.md"), path.join(cliRoot, "README.md"));
await cp(path.join(rootDir, "LICENSE"), path.join(cliRoot, "LICENSE"));
await writeFile(path.join(cliRoot, "package.json"), `${JSON.stringify({
  name: pkg.name,
  version,
  description: pkg.description,
  type: "module",
  bin: {
    skillops: "bin/skillops"
  },
  engines: pkg.engines,
  license: pkg.license
}, null, 2)}\n`);

await writeFile(path.join(cliRoot, "bin", "skillops"), `#!/bin/sh
set -e
DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec node "$DIR/../dist/cli/index.js" "$@"
`);
await chmod(path.join(cliRoot, "bin", "skillops"), 0o755);

await writeFile(path.join(cliRoot, "bin", "skillops.cmd"), `@echo off\r
node "%~dp0\\..\\dist\\cli\\index.js" %*\r
`);

await writeFile(path.join(assetsDir, "install.sh"), installSh(repo));
await writeFile(path.join(assetsDir, "install.ps1"), installPs1(repo));
await chmod(path.join(assetsDir, "install.sh"), 0o755);

console.log(`Prepared CLI package staging for ${pkg.name} ${version}`);
console.log(`CLI root: ${path.relative(rootDir, cliRoot)}`);
console.log(`Installer assets: ${path.relative(rootDir, assetsDir)}`);

async function assertBuilt() {
  const cliEntry = path.join(rootDir, "dist", "cli", "index.js");
  try {
    await readFile(cliEntry, "utf8");
  } catch {
    throw new Error("dist/cli/index.js is missing. Run npm run build:cli first.");
  }
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item === "--repo") result.repo = args[index + 1];
    if (item === "--version") result.version = args[index + 1];
  }
  return result;
}

function installSh(defaultRepo) {
  return `#!/bin/sh
set -eu

repo="\${SKILLOPS_REPO:-${defaultRepo}}"
install_root="\${SKILLOPS_HOME:-$HOME/.skillops}"
cli_dir="$install_root/cli/latest"
bin_dir="\${SKILLOPS_BIN_DIR:-$HOME/.local/bin}"
tmp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"
case "$os" in
  darwin) platform="darwin" ;;
  linux) platform="linux" ;;
  *) echo "Unsupported OS: $os" >&2; exit 1 ;;
esac
case "$arch" in
  x86_64|amd64) cpu="x64" ;;
  arm64|aarch64) cpu="arm64" ;;
  *) echo "Unsupported architecture: $arch" >&2; exit 1 ;;
esac

asset="skillops-cli-$platform-$cpu.tar.gz"
url="https://github.com/$repo/releases/latest/download/$asset"
archive="$tmp_dir/$asset"

echo "Downloading $url"
curl -fsSL "$url" -o "$archive"
mkdir -p "$cli_dir" "$bin_dir"
rm -rf "$cli_dir"
mkdir -p "$cli_dir"
tar -xzf "$archive" -C "$tmp_dir"
cp -R "$tmp_dir/skillops-cli/." "$cli_dir/"
chmod +x "$cli_dir/bin/skillops"
ln -sf "$cli_dir/bin/skillops" "$bin_dir/skillops"

case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *)
    shell_name="$(basename "\${SHELL:-}")"
    if [ "$shell_name" = "bash" ]; then profile="$HOME/.bashrc"; else profile="$HOME/.zshrc"; fi
    export_line="export PATH=\\"$bin_dir:\\$PATH\\""
    if [ ! -f "$profile" ] || ! grep -Fq "$export_line" "$profile"; then
      printf "\\n# SkillOps CLI\\n%s\\n" "$export_line" >> "$profile"
    fi
    echo "Added $bin_dir to $profile. Open a new terminal before running skillops."
    ;;
esac

"$bin_dir/skillops" doctor
`;
}

function installPs1(defaultRepo) {
  return `$ErrorActionPreference = "Stop"

$Repo = if ($env:SKILLOPS_REPO) { $env:SKILLOPS_REPO } else { "${defaultRepo}" }
$InstallRoot = if ($env:SKILLOPS_HOME) { $env:SKILLOPS_HOME } else { Join-Path $HOME ".skillops" }
$CliDir = Join-Path $InstallRoot "cli\\latest"
$BinDir = if ($env:SKILLOPS_BIN_DIR) { $env:SKILLOPS_BIN_DIR } else { Join-Path $InstallRoot "bin" }
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("skillops-" + [System.Guid]::NewGuid().ToString("N"))
$Asset = "skillops-cli-win-x64.zip"
$Url = "https://github.com/$Repo/releases/latest/download/$Asset"
$Archive = Join-Path $TempDir $Asset

New-Item -ItemType Directory -Force -Path $TempDir, $CliDir, $BinDir | Out-Null
Write-Host "Downloading $Url"
Invoke-WebRequest -Uri $Url -OutFile $Archive
if (Test-Path $CliDir) { Remove-Item -Recurse -Force $CliDir }
New-Item -ItemType Directory -Force -Path $CliDir | Out-Null
Expand-Archive -Path $Archive -DestinationPath $TempDir -Force
Copy-Item -Recurse -Force (Join-Path $TempDir "skillops-cli\\*") $CliDir

$Shim = Join-Path $BinDir "skillops.cmd"
Set-Content -Path $Shim -Value "@echo off\`r\`nnode \`"%~dp0\\..\\cli\\latest\\dist\\cli\\index.js\`" %*\`r\`n"

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathParts = @($UserPath -split ";" | Where-Object { $_ })
if ($PathParts -notcontains $BinDir) {
  $NextPath = (@($PathParts) + $BinDir) -join ";"
  [Environment]::SetEnvironmentVariable("Path", $NextPath, "User")
  Write-Host "Added $BinDir to the user PATH. Open a new terminal before running skillops."
}

& $Shim doctor
Remove-Item -Recurse -Force $TempDir
`;
}
