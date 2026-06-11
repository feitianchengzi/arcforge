import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagePath = path.join(rootDir, "package.json");
const releaseDir = path.join(rootDir, "release");
const cliWorkDir = path.join(releaseDir, "cli-work");
const cliRoot = path.join(cliWorkDir, "arcforge-cli");
const assetsDir = path.join(releaseDir, "cli-assets");
const pkg = JSON.parse(await readFile(packagePath, "utf8"));
const options = parseArgs(process.argv.slice(2));
const repo = options.repo ?? "owner/arcforge";
const version = options.version ?? pkg.version;
const requiredNodeMajor = Number(pkg.engines?.node?.match(/\d+/)?.[0] ?? 20);

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
    arcforge: "bin/arcforge"
  },
  engines: pkg.engines,
  license: pkg.license
}, null, 2)}\n`);

await writeFile(path.join(cliRoot, "bin", "arcforge"), `#!/bin/sh
set -e
PRG="$0"
while [ -h "$PRG" ]; do
  DIR="$(CDPATH= cd -P -- "$(dirname -- "$PRG")" && pwd)"
  LINK="$(readlink "$PRG")"
  case "$LINK" in
    /*) PRG="$LINK" ;;
    *) PRG="$DIR/$LINK" ;;
  esac
done
DIR="$(CDPATH= cd -P -- "$(dirname -- "$PRG")" && pwd)"
exec node "$DIR/../dist/cli/index.js" "$@"
`);
await chmod(path.join(cliRoot, "bin", "arcforge"), 0o755);

await writeFile(path.join(cliRoot, "bin", "arcforge.cmd"), `@echo off\r
node "%~dp0\\..\\dist\\cli\\index.js" %*\r
`);

await writeFile(path.join(assetsDir, "install.sh"), installSh(repo, requiredNodeMajor));
await writeFile(path.join(assetsDir, "install.ps1"), installPs1(repo, requiredNodeMajor));
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

function installSh(defaultRepo, requiredNodeMajor) {
  return `#!/bin/sh
set -eu

repo="\${ARCFORGE_REPO:-${defaultRepo}}"
required_node_major="${requiredNodeMajor}"
install_root="\${ARCFORGE_HOME:-$HOME/.arcforge}"
cli_dir="$install_root/cli/latest"
bin_dir="\${ARCFORGE_BIN_DIR:-$HOME/.local/bin}"
tmp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js $required_node_major or newer is required to run ArcForge CLI. Install Node.js, then rerun this installer." >&2
  exit 1
fi
node_version="$(node -p 'process.versions.node' 2>/dev/null || true)"
node_major="\${node_version%%.*}"
case "$node_major" in
  ''|*[!0-9]*)
    echo "Unable to determine Node.js version. Install Node.js $required_node_major or newer, then rerun this installer." >&2
    exit 1
    ;;
esac
if [ "$node_major" -lt "$required_node_major" ]; then
  echo "Node.js $required_node_major or newer is required to run ArcForge CLI. Found $node_version." >&2
  exit 1
fi

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

asset="arcforge-cli-$platform-$cpu.tar.gz"
url="https://github.com/$repo/releases/latest/download/$asset"
archive="$tmp_dir/$asset"

echo "Downloading $url"
curl -fsSL "$url" -o "$archive"
mkdir -p "$cli_dir" "$bin_dir"
rm -rf "$cli_dir"
mkdir -p "$cli_dir"
tar -xzf "$archive" -C "$tmp_dir"
cp -R "$tmp_dir/arcforge-cli/." "$cli_dir/"
chmod +x "$cli_dir/bin/arcforge"
shim="$bin_dir/arcforge"
rm -f "$shim"
cat > "$shim" <<EOF
#!/bin/sh
exec node "$cli_dir/dist/cli/index.js" "\\$@"
EOF
chmod +x "$shim"

case ":$PATH:" in
  *":$bin_dir:"*) ;;
  *)
    shell_name="$(basename "\${SHELL:-}")"
    if [ "$shell_name" = "bash" ]; then profile="$HOME/.bashrc"; else profile="$HOME/.zshrc"; fi
    export_line="export PATH=\\"$bin_dir:\\$PATH\\""
    if [ ! -f "$profile" ] || ! grep -Fq "$export_line" "$profile"; then
      printf "\\n# ArcForge CLI\\n%s\\n" "$export_line" >> "$profile"
    fi
    echo "Added $bin_dir to $profile. Open a new terminal before running arcforge."
    ;;
esac

"$shim" doctor
`;
}

function installPs1(defaultRepo, requiredNodeMajor) {
  return `$ErrorActionPreference = "Stop"

$Repo = if ($env:ARCFORGE_REPO) { $env:ARCFORGE_REPO } else { "${defaultRepo}" }
$RequiredNodeMajor = ${requiredNodeMajor}
$InstallRoot = if ($env:ARCFORGE_HOME) { $env:ARCFORGE_HOME } else { Join-Path $HOME ".arcforge" }
$CliDir = Join-Path $InstallRoot "cli\\latest"
$BinDir = if ($env:ARCFORGE_BIN_DIR) { $env:ARCFORGE_BIN_DIR } else { Join-Path $InstallRoot "bin" }
$TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("arcforge-" + [System.Guid]::NewGuid().ToString("N"))
$Asset = "arcforge-cli-win-x64.zip"
$Url = "https://github.com/$Repo/releases/latest/download/$Asset"
$Archive = Join-Path $TempDir $Asset

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCommand) {
  throw "Node.js $RequiredNodeMajor or newer is required to run ArcForge CLI. Install Node.js, then rerun this installer."
}
$NodeVersionText = (& node -p "process.versions.node").Trim()
try {
  $NodeVersion = [version]$NodeVersionText
} catch {
  throw "Unable to determine Node.js version. Install Node.js $RequiredNodeMajor or newer, then rerun this installer."
}
if ($NodeVersion.Major -lt $RequiredNodeMajor) {
  throw "Node.js $RequiredNodeMajor or newer is required to run ArcForge CLI. Found $NodeVersionText."
}

New-Item -ItemType Directory -Force -Path $TempDir, $CliDir, $BinDir | Out-Null
Write-Host "Downloading $Url"
Invoke-WebRequest -Uri $Url -OutFile $Archive
if (Test-Path $CliDir) { Remove-Item -Recurse -Force $CliDir }
New-Item -ItemType Directory -Force -Path $CliDir | Out-Null
Expand-Archive -Path $Archive -DestinationPath $TempDir -Force
Copy-Item -Recurse -Force (Join-Path $TempDir "arcforge-cli\\*") $CliDir

$Shim = Join-Path $BinDir "arcforge.cmd"
$CliEntry = Join-Path $CliDir "dist\\cli\\index.js"
$ExistingShim = Get-Item -LiteralPath $Shim -Force -ErrorAction SilentlyContinue
if ($ExistingShim) { Remove-Item -LiteralPath $Shim -Force }
Set-Content -LiteralPath $Shim -Value "@echo off\`r\`nnode \`"$CliEntry\`" %*\`r\`n"

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathParts = @($UserPath -split ";" | Where-Object { $_ })
if ($PathParts -notcontains $BinDir) {
  $NextPath = (@($PathParts) + $BinDir) -join ";"
  [Environment]::SetEnvironmentVariable("Path", $NextPath, "User")
  Write-Host "Added $BinDir to the user PATH. Open a new terminal before running arcforge."
}

& $Shim doctor
Remove-Item -Recurse -Force $TempDir
`;
}
