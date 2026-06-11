import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(rootDir, "app.manifest.json");
const packagePath = path.join(rootDir, "package.json");
const outputDir = path.join(rootDir, "dist-package");
const outputPath = path.join(outputDir, "electron-builder.generated.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const pkg = JSON.parse(await readFile(packagePath, "utf8"));

const requiredFields = ["appId", "packageName", "productName", "executableName", "version", "description"];
for (const field of requiredFields) {
  if (!manifest[field] || typeof manifest[field] !== "string") {
    throw new Error(`app.manifest.json is missing required string field: ${field}`);
  }
}

const syncedPackageFields = {
  name: "packageName",
  version: "version",
  description: "description"
};

for (const [packageField, manifestField] of Object.entries(syncedPackageFields)) {
  if (pkg[packageField] !== manifest[manifestField]) {
    throw new Error(
      `package.json ${packageField} (${pkg[packageField]}) must match app.manifest.json ${manifestField} (${manifest[manifestField]})`
    );
  }
}

const builderConfig = {
  appId: manifest.appId,
  productName: manifest.productName,
  executableName: manifest.executableName,
  copyright: manifest.copyright,
  artifactName: manifest.artifactName,
  directories: {
    output: manifest.bundle?.outputDir ?? "release",
    buildResources: "build"
  },
  asar: manifest.bundle?.asar ?? true,
  files: [
    "package.json",
    "dist/**/*",
    "dist-ui/**/*",
    "app.manifest.json",
    "arcforge.config.example.json",
    "README.md",
    "LICENSE"
  ],
  extraMetadata: {
    name: manifest.packageName,
    version: manifest.version,
    description: manifest.description,
    main: pkg.main,
    bin: pkg.bin,
    license: pkg.license
  },
  mac: {
    category: manifest.mac?.category,
    target: manifest.mac?.targets ?? ["dmg", "zip"]
  },
  win: {
    target: manifest.windows?.targets ?? ["nsis", "zip"]
  },
  linux: {
    category: manifest.linux?.category,
    maintainer: manifest.linux?.maintainer,
    target: manifest.linux?.targets ?? ["AppImage", "deb", "tar.gz"]
  },
  publish: null
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(builderConfig, null, 2)}\n`);

console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
