/**
 * One-time generator for the real-face eps-calibration fixture
 * (fixtures/recognition/seed-descriptors.json).
 *
 * Commits ONLY 128-float face-api descriptors — never images. The vectors are
 * derived data (not reconstructable to a face), so no image licensing/privacy
 * travels into the repo. Sources are deliberately public-domain anyway.
 *
 * Two slices, for the two sides of calibration:
 *   - wikimedia-pd  : public-domain identities (Commons file search), several
 *                     genuine photos each -> REAL intra-person pairs.
 *   - hopechest-seed: distinct archival faces from the app's public-domain seed
 *                     photos (scripts/image-manifest.json) -> inter-person breadth,
 *                     in Hope Chest's actual old/scanned-photo domain.
 *
 * Pure-WASM face-api — NO native deps (tfjs-node won't build on Node 24). This
 * script is intentionally a plain .cjs OUTSIDE the tsc/eslint build and its deps
 * are NOT in package.json (they're heavy and only needed for this one-off).
 *
 * To regenerate:
 *   nvm use 24
 *   npm i --no-save --omit=optional --ignore-scripts \
 *     @tensorflow/tfjs @tensorflow/tfjs-backend-wasm @vladmandic/face-api jpeg-js
 *   # download model weights into .tmp-calib/models (see docs/recognition.md):
 *   #   ssd_mobilenetv1, face_landmark_68, face_recognition  (from
 *   #   raw.githubusercontent.com/vladmandic/face-api/master/model)
 *   node scripts/gen-seed-descriptors.cjs
 *   npm ci   # restore the normal dev env afterwards
 *
 * Then validate:  npm run calibrate:eps -- fixtures/recognition/seed-descriptors.json
 */
const fs = require("node:fs");
const path = require("node:path");
const faceapi = require("@vladmandic/face-api/dist/face-api.node-wasm.js");
const tf = faceapi.tf;
const { setWasmPaths } = require("@tensorflow/tfjs-backend-wasm");
const jpeg = require("jpeg-js");

const MODELS = ".tmp-calib/models";
const OUT = "fixtures/recognition/seed-descriptors.json";

// PD figures with rich, face-detectable photographic records (pre-1929).
const PD_IDENTITIES = [
  "Abraham Lincoln",
  "Theodore Roosevelt",
  "Calvin Coolidge",
  "Thomas Edison",
  "William Howard Taft",
  "William McKinley",
  "Grover Cleveland",
  "Andrew Carnegie",
  "Ulysses S. Grant",
  "Mark Twain",
];
const PER_IDENTITY = 6;
const MAX_CANDIDATES = 45;
const SEED_FACE_CAP = 40;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = "hopechest-calibration/1.0 (research; contact me@wschorn.com)";
const opts = () => new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

async function imageToTensor(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { width, height, data } = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  return tf.tidy(() => tf.tensor3d(data, [height, width, 4], "int32").slice([0, 0, 0], [height, width, 3]));
}

async function largestDescriptor(t) {
  const r = await faceapi.detectAllFaces(t, opts()).withFaceLandmarks().withFaceDescriptors();
  if (!r.length) return null;
  r.sort((a, b) => b.detection.box.area - a.detection.box.area);
  return Array.from(r[0].descriptor);
}

async function allDescriptors(t) {
  const r = await faceapi.detectAllFaces(t, opts()).withFaceLandmarks().withFaceDescriptors();
  return r.map((x) => Array.from(x.descriptor));
}

// Commons file search — portraits surface first (far higher yield than scanning
// a broad category full of statues/documents/engravings).
async function commonsJpgTitles(name) {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search` +
    `&srnamespace=6&srlimit=${MAX_CANDIDATES}&srsearch=${encodeURIComponent(`${name} portrait photograph`)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(800 * (attempt + 1));
    const res = await fetch(url, { headers: { "user-agent": UA } });
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      return (j.query?.search ?? [])
        .map((m) => m.title)
        .filter((t) => /\.jpe?g$/i.test(t))
        .map((t) => t.replace(/^File:/, ""));
    } catch {
      /* HTML (rate limit) -> back off and retry */
    }
  }
  throw new Error("search API kept returning non-JSON (rate limited)");
}

const filePath = (title) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=512`;

async function main() {
  setWasmPaths("node_modules/@tensorflow/tfjs-backend-wasm/dist/");
  await tf.setBackend("wasm");
  await tf.ready();
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS);
  console.log("models loaded, backend", tf.getBackend());

  const samples = [];

  for (const name of PD_IDENTITIES) {
    const id = name.toLowerCase().replace(/\s+/g, "-");
    let kept = 0;
    let titles = [];
    try {
      titles = await commonsJpgTitles(name);
    } catch (e) {
      console.log(`  ${name}: search failed (${e.message})`);
    }
    for (const title of titles) {
      if (kept >= PER_IDENTITY) break;
      await sleep(250);
      try {
        const t = await imageToTensor(filePath(title));
        const desc = await largestDescriptor(t);
        t.dispose();
        if (desc) {
          samples.push({ identity: id, source: "wikimedia-pd", embedding: desc });
          kept++;
        }
      } catch {
        /* non-face / unreadable */
      }
    }
    console.log(`  ${name}: kept ${kept}/${PER_IDENTITY}`);
  }

  const manifest = require(path.join(process.cwd(), "scripts/image-manifest.json"));
  let seedFaces = 0;
  for (const photo of manifest) {
    if (seedFaces >= SEED_FACE_CAP) break;
    try {
      const t = await imageToTensor(photo.src);
      const descs = await allDescriptors(t);
      t.dispose();
      for (let i = 0; i < descs.length && seedFaces < SEED_FACE_CAP; i++) {
        samples.push({ identity: `seed:${photo.slug}#${i}`, source: "hopechest-seed", embedding: descs[i] });
        seedFaces++;
      }
    } catch {
      /* skip */
    }
  }
  console.log(`  seed archival faces: ${seedFaces}`);

  const out = {
    note:
      "Real face-api faceRecognitionNet (128-d) descriptors for eps calibration. " +
      "wikimedia-pd: public-domain identities with multiple genuine photos (intra-person pairs). " +
      "hopechest-seed: distinct archival faces from the app's public-domain seed photos (inter-person, old-photo domain). " +
      "Descriptors only — no images committed. Regenerate with scripts/gen-seed-descriptors.cjs.",
    dim: 128,
    samples,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nwrote ${OUT}: ${samples.length} samples, ${new Set(samples.map((s) => s.identity)).size} identities`);
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
