const CYCLE_MS = 2200;
const S2_DELAY_MS = 500;

const dom = {
  canvas: document.getElementById("scene"),
  waveform: document.getElementById("waveform"),
  mode: document.getElementById("mode"),
  ratio: document.getElementById("ratio"),
  ratioValue: document.getElementById("ratio-value"),
  speed: document.getElementById("speed"),
  speedValue: document.getElementById("speed-value"),
  toggle: document.getElementById("toggle"),
  restart: document.getElementById("restart"),
  phase: document.getElementById("phase"),
  suppression: document.getElementById("suppression"),
  activeRegions: document.getElementById("active-regions"),
  activeNeurons: document.getElementById("active-neurons"),
  timelineReadout: document.getElementById("timeline-readout"),
  thalamicPop: document.getElementById("thalamic-pop"),
  corticalPop: document.getElementById("cortical-pop"),
  ca3Pop: document.getElementById("ca3-pop"),
  gabaPop: document.getElementById("gaba-pop"),
  cholinergicPop: document.getElementById("cholinergic-pop")
};

const regionDefs = [
  { id: "thalamus", name: "Thalamus", peakMs: 30, widthMs: 13, s2: { normal: 0.45, impaired: 0.93 } },
  { id: "stgL", name: "STG Left", peakMs: 55, widthMs: 18, s2: { normal: 0.34, impaired: 0.87 } },
  { id: "stgR", name: "STG Right", peakMs: 55, widthMs: 18, s2: { normal: 0.34, impaired: 0.87 } },
  { id: "dlpfcL", name: "DLPFC Left", peakMs: 118, widthMs: 35, s2: { normal: 0.52, impaired: 0.94 } },
  { id: "dlpfcR", name: "DLPFC Right", peakMs: 118, widthMs: 35, s2: { normal: 0.52, impaired: 0.94 } },
  { id: "acc", name: "Anterior Cingulate", peakMs: 128, widthMs: 35, s2: { normal: 0.55, impaired: 0.9 } },
  { id: "insulaL", name: "Insula Left", peakMs: 110, widthMs: 32, s2: { normal: 0.5, impaired: 0.93 } },
  { id: "insulaR", name: "Insula Right", peakMs: 110, widthMs: 32, s2: { normal: 0.5, impaired: 0.93 } },
  { id: "claustrumL", name: "Claustrum Left", peakMs: 132, widthMs: 30, s2: { normal: 0.48, impaired: 0.9 } },
  { id: "claustrumR", name: "Claustrum Right", peakMs: 132, widthMs: 30, s2: { normal: 0.48, impaired: 0.9 } },
  { id: "hippoL", name: "Hippocampus Left", peakMs: 250, widthMs: 46, s2: { normal: 0.3, impaired: 0.83 } },
  { id: "hippoR", name: "Hippocampus Right", peakMs: 250, widthMs: 46, s2: { normal: 0.3, impaired: 0.83 } },
  { id: "septum", name: "Septal Cholinergic", peakMs: 8, widthMs: 10, s2: { normal: 0.72, impaired: 0.72 } }
];

const state = {
  mode: "normal",
  ratio: 0.35,
  speed: 1.0,
  running: true,
  simTimeMs: 0,
  rendererMode: "loading"
};

let engine = null;
let previousFrame = performance.now();

wireControls();
updateControlLabels();
updateReadouts(new Map(), 0);
drawWaveform(0);
boot();

async function boot() {
  engine = await createEngine();
  state.rendererMode = engine.label === "3D" ? "3D" : "2D fallback";
  requestAnimationFrame(frame);
}

async function createEngine() {
  const load = await loadThree();
  if (!load.ok) {
    return createFallback2D();
  }
  try {
    return createThreeEngine(load.THREE);
  } catch (error) {
    console.warn("3D init failed; using fallback:", error);
    return createFallback2D();
  }
}

async function loadThree() {
  try {
    const THREE = await import("https://esm.sh/three@0.162.0");
    return { ok: true, THREE };
  } catch (error) {
    console.warn("Could not load three:", error);
    return { ok: false };
  }
}

function createThreeEngine(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010101);
  scene.fog = new THREE.Fog(0x010101, 18, 42);

  const camera = new THREE.PerspectiveCamera(
    47,
    dom.canvas.clientWidth / Math.max(1, dom.canvas.clientHeight),
    0.1,
    100
  );
  camera.position.set(0, 2.5, 21.2);

  const renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(dom.canvas.clientWidth, dom.canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x010101, 1);

  const amb = new THREE.AmbientLight(0xffffff, 0.26);
  scene.add(amb);

  const key = new THREE.DirectionalLight(0xffffff, 0.98);
  key.position.set(5, 8, 9);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd6d6d6, 0.38);
  fill.position.set(-8, 2, -6);
  scene.add(fill);

  const rim = new THREE.PointLight(0xffffff, 0.32, 50);
  rim.position.set(0, -5, 12);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  const cortexLeft = createDetailedHemisphere(THREE, { side: -1, seed: 11 });
  const cortexRight = createDetailedHemisphere(THREE, { side: 1, seed: 37 });
  cortexLeft.group.position.set(-2.35, 0.25, 0.0);
  cortexRight.group.position.set(2.35, 0.25, 0.0);
  root.add(cortexLeft.group);
  root.add(cortexRight.group);

  const corpusCallosum = new THREE.Mesh(
    new THREE.TorusGeometry(1.95, 0.43, 28, 80, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x1f1f1f,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      opacity: 0.52,
      depthWrite: false
    })
  );
  corpusCallosum.rotation.x = Math.PI * 0.58;
  corpusCallosum.position.set(0, -0.4, -0.5);
  root.add(corpusCallosum);

  const cerebellumGroup = new THREE.Group();
  const cereGeoL = new THREE.IcosahedronGeometry(1.85, 4);
  const cereGeoR = cereGeoL.clone();
  deformCerebellumGeometry(THREE, cereGeoL, 19);
  deformCerebellumGeometry(THREE, cereGeoR, 27);
  const cereMat = new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 0.92,
    metalness: 0.01,
    transparent: true,
    opacity: 0.68
  });
  const cereL = new THREE.Mesh(cereGeoL, cereMat.clone());
  const cereR = new THREE.Mesh(cereGeoR, cereMat.clone());
  cereL.position.set(-1.05, -3.2, -3.35);
  cereR.position.set(1.05, -3.2, -3.35);
  cereL.scale.set(1.2, 0.78, 0.92);
  cereR.scale.set(1.2, 0.78, 0.92);
  cerebellumGroup.add(cereL);
  cerebellumGroup.add(cereR);
  root.add(cerebellumGroup);

  const regionLayout = {
    thalamus: [0, -0.9, 0.45],
    stgL: [-4.6, 0.7, 1.05],
    stgR: [4.6, 0.7, 1.05],
    dlpfcL: [-3.6, 2.6, 2.0],
    dlpfcR: [3.6, 2.6, 2.0],
    acc: [0, 2.2, 1.55],
    insulaL: [-2.9, 0.1, 0.75],
    insulaR: [2.9, 0.1, 0.75],
    claustrumL: [-2.2, -0.2, 0.3],
    claustrumR: [2.2, -0.2, 0.3],
    hippoL: [-2.0, -1.85, -1.45],
    hippoR: [2.0, -1.85, -1.45],
    septum: [0, -2.7, 0.1]
  };

  const regionMeshes = new Map();
  for (const def of regionDefs) {
    const size = def.id.startsWith("claustrum")
      ? 0.4
      : def.id.startsWith("hippo")
        ? 0.68
        : def.id === "septum"
          ? 0.45
          : 0.58;

    const regionGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(size, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0x767676,
        emissive: 0x222222,
        emissiveIntensity: 0.25,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.7,
        depthWrite: false
      })
    );
    regionGroup.add(body);

    const neuronCount = 130;
    const positions = new Float32Array(neuronCount * 3);
    for (let i = 0; i < neuronCount; i += 1) {
      const r = Math.cbrt(Math.random()) * size * 1.08;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      const idx = i * 3;
      positions[idx] = r * Math.sin(p) * Math.cos(t);
      positions[idx + 1] = r * Math.sin(p) * Math.sin(t);
      positions[idx + 2] = r * Math.cos(p);
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const cloud = new THREE.Points(
      cloudGeo,
      new THREE.PointsMaterial({
        color: 0xf4f4f4,
        size: 0.045,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      })
    );
    regionGroup.add(cloud);

    const pos = regionLayout[def.id];
    regionGroup.position.set(pos[0], pos[1], pos[2]);
    root.add(regionGroup);
    regionMeshes.set(def.id, { group: regionGroup, body, cloud });
  }

  const connections = [
    ["thalamus", "stgL"],
    ["thalamus", "stgR"],
    ["stgL", "dlpfcL"],
    ["stgR", "dlpfcR"],
    ["stgL", "hippoL"],
    ["stgR", "hippoR"],
    ["septum", "hippoL"],
    ["septum", "hippoR"],
    ["hippoL", "dlpfcL"],
    ["hippoR", "dlpfcR"],
    ["acc", "thalamus"],
    ["insulaL", "acc"],
    ["insulaR", "acc"]
  ];

  const lineSet = [];
  for (const [a, b] of connections) {
    const p0 = regionMeshes.get(a).group.position.clone();
    const p1 = regionMeshes.get(b).group.position.clone();
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y += 0.42 + p0.distanceTo(p1) * 0.05;
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const points = curve.getPoints(34);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xc5c5c5, transparent: true, opacity: 0.12 })
    );
    root.add(line);
    lineSet.push({ a, b, line });
  }

  const tractBundles = [
    createFiberBundle(THREE, root, regionLayout.thalamus, regionLayout.stgL, { arc: 0.9, strands: 16, keys: ["thalamus", "stgL"] }),
    createFiberBundle(THREE, root, regionLayout.thalamus, regionLayout.stgR, { arc: 0.9, strands: 16, keys: ["thalamus", "stgR"] }),
    createFiberBundle(THREE, root, regionLayout.stgL, regionLayout.hippoL, { arc: 1.0, strands: 12, keys: ["stgL", "hippoL"] }),
    createFiberBundle(THREE, root, regionLayout.stgR, regionLayout.hippoR, { arc: 1.0, strands: 12, keys: ["stgR", "hippoR"] }),
    createFiberBundle(THREE, root, regionLayout.hippoL, regionLayout.dlpfcL, { arc: 1.2, strands: 10, keys: ["hippoL", "dlpfcL"] }),
    createFiberBundle(THREE, root, regionLayout.hippoR, regionLayout.dlpfcR, { arc: 1.2, strands: 10, keys: ["hippoR", "dlpfcR"] }),
    createFiberBundle(THREE, root, regionLayout.septum, regionLayout.hippoL, { arc: 0.6, strands: 8, keys: ["septum", "hippoL"] }),
    createFiberBundle(THREE, root, regionLayout.septum, regionLayout.hippoR, { arc: 0.6, strands: 8, keys: ["septum", "hippoR"] })
  ];

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  dom.canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    dom.canvas.setPointerCapture(event.pointerId);
  });
  dom.canvas.addEventListener("pointerup", (event) => {
    dragging = false;
    dom.canvas.releasePointerCapture(event.pointerId);
  });
  dom.canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    root.rotation.y += dx * 0.005;
    root.rotation.x = clamp(root.rotation.x + dy * 0.003, -0.55, 0.55);
  });

  function resize() {
    const width = dom.canvas.clientWidth;
    const height = dom.canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  return {
    label: "3D",
    tick(cycleMs, intensities) {
      root.rotation.y += 0.0013;

      const corticalDrive = clamp(mean([
        intensities.get("stgL") ?? 0,
        intensities.get("stgR") ?? 0,
        intensities.get("dlpfcL") ?? 0,
        intensities.get("dlpfcR") ?? 0,
        intensities.get("insulaL") ?? 0,
        intensities.get("insulaR") ?? 0
      ]), 0, 1);
      const hippocampalDrive = clamp(mean([
        intensities.get("hippoL") ?? 0,
        intensities.get("hippoR") ?? 0
      ]), 0, 1);

      cortexLeft.cortex.material.opacity = 0.33 + corticalDrive * 0.28;
      cortexRight.cortex.material.opacity = 0.33 + corticalDrive * 0.28;
      cortexLeft.cortex.material.emissiveIntensity = 0.16 + corticalDrive * 0.55;
      cortexRight.cortex.material.emissiveIntensity = 0.16 + corticalDrive * 0.55;
      cortexLeft.neurons.material.opacity = 0.14 + corticalDrive * 0.66;
      cortexRight.neurons.material.opacity = 0.14 + corticalDrive * 0.66;
      cortexLeft.neurons.material.size = 0.018 + corticalDrive * 0.018;
      cortexRight.neurons.material.size = 0.018 + corticalDrive * 0.018;
      cereL.material.opacity = 0.4 + hippocampalDrive * 0.34;
      cereR.material.opacity = 0.4 + hippocampalDrive * 0.34;

      for (const [id, mesh] of regionMeshes.entries()) {
        const val = clamp((intensities.get(id) ?? 0) / 1.1, 0, 1);
        mesh.body.material.emissiveIntensity = 0.1 + val * 1.8;
        mesh.body.material.opacity = 0.3 + val * 0.65;
        mesh.group.scale.setScalar(1 + val * 0.14);
        mesh.cloud.material.opacity = 0.18 + val * 0.8;
        mesh.cloud.material.size = 0.018 + val * 0.05;
      }

      for (const edge of lineSet) {
        const val = ((intensities.get(edge.a) ?? 0) + (intensities.get(edge.b) ?? 0)) * 0.5;
        edge.line.material.opacity = 0.03 + clamp(val, 0, 1) * 0.42;
      }

      for (const bundle of tractBundles) {
        const drive = clamp(bundle.weightFn(intensities), 0, 1);
        for (const strand of bundle.strands) {
          strand.material.opacity = strand.baseOpacity + drive * 0.18;
        }
      }

      renderer.render(scene, camera);
    }
  };
}

function createDetailedHemisphere(THREE, options) {
  const { side, seed } = options;
  const group = new THREE.Group();
  const cortexGeo = new THREE.IcosahedronGeometry(1, 5);
  deformCortexGeometry(THREE, cortexGeo, side, seed);

  const cortex = new THREE.Mesh(
    cortexGeo,
    new THREE.MeshStandardMaterial({
      color: 0x141414,
      emissive: 0x080808,
      emissiveIntensity: 0.22,
      roughness: 0.93,
      metalness: 0.02,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
  );
  group.add(cortex);

  const whiteMatter = new THREE.Mesh(
    cortexGeo.clone().scale(0.89, 0.89, 0.89),
    new THREE.MeshStandardMaterial({
      color: 0x242424,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    })
  );
  group.add(whiteMatter);

  const folds = new THREE.LineSegments(
    new THREE.EdgesGeometry(cortexGeo, 28),
    new THREE.LineBasicMaterial({ color: 0x5a5a5a, transparent: true, opacity: 0.24 })
  );
  group.add(folds);

  const neurons = createSurfaceNeurons(THREE, cortexGeo, 2600);
  group.add(neurons);

  return { group, cortex, whiteMatter, folds, neurons };
}

function deformCortexGeometry(THREE, geometry, side, seed) {
  const pos = geometry.attributes.position;
  const n = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    n.fromBufferAttribute(pos, i).normalize();
    v.set(n.x * 4.45, n.y * 3.78, n.z * 4.08);

    if (side < 0 && v.x > 0) v.x *= 0.18;
    if (side > 0 && v.x < 0) v.x *= 0.18;
    v.x += side * 0.6;

    const baseNoise = fbm3D(v.x * 0.72, v.y * 1.04, v.z * 0.86, seed, 4);
    const fineNoise = fbm3D(v.x * 1.84, v.y * 1.96, v.z * 1.72, seed + 13, 3);
    const gyri = (baseNoise - 0.5) * 0.42 + (fineNoise - 0.5) * 0.17;
    const sulciPattern = Math.abs(
      Math.sin(v.y * 2.85 + baseNoise * 5.4 + seed * 0.31) *
      Math.cos(v.z * 2.25 - fineNoise * 4.8)
    );
    const sulci = -0.23 * sulciPattern;
    v.addScaledVector(n, gyri + sulci);

    const temporalBulge = 0.16 * Math.sin(v.y * 0.72) * (1 - Math.min(1, Math.abs(v.x) / 5.5));
    v.z += temporalBulge;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function deformCerebellumGeometry(THREE, geometry, seed) {
  const pos = geometry.attributes.position;
  const n = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    n.fromBufferAttribute(pos, i).normalize();
    v.copy(n);
    const folds = Math.sin(v.y * 12 + seed * 0.3) * Math.cos(v.z * 9.5 + seed * 0.2);
    const fine = fbm3D(v.x * 3.5, v.y * 3.2, v.z * 3.1, seed, 3) - 0.5;
    v.addScaledVector(n, folds * 0.14 + fine * 0.11);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createSurfaceNeurons(THREE, geometry, count) {
  const src = geometry.attributes.position;
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * src.count);
    const jitter = 0.03;
    points[i * 3] = src.getX(idx) * (0.93 + Math.random() * 0.05) + (Math.random() - 0.5) * jitter;
    points[i * 3 + 1] = src.getY(idx) * (0.93 + Math.random() * 0.05) + (Math.random() - 0.5) * jitter;
    points[i * 3 + 2] = src.getZ(idx) * (0.93 + Math.random() * 0.05) + (Math.random() - 0.5) * jitter;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(points, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xf8f8f8,
      size: 0.022,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    })
  );
}

function createFiberBundle(THREE, root, fromArr, toArr, options) {
  const from = new THREE.Vector3(fromArr[0], fromArr[1], fromArr[2]);
  const to = new THREE.Vector3(toArr[0], toArr[1], toArr[2]);
  const strands = [];
  const count = options.strands ?? 10;
  const arc = options.arc ?? 1;
  const spread = 0.75;

  for (let i = 0; i < count; i += 1) {
    const t = (i / Math.max(1, count - 1)) - 0.5;
    const mid = from.clone().lerp(to, 0.5);
    mid.y += arc + (Math.random() - 0.5) * 0.45;
    mid.x += t * spread;
    mid.z += (Math.random() - 0.5) * 0.45;
    const c1 = from.clone().lerp(mid, 0.45);
    const c2 = to.clone().lerp(mid, 0.45);
    const curve = new THREE.CubicBezierCurve3(from, c1, c2, to);
    const points = curve.getPoints(38);
    const mat = new THREE.LineBasicMaterial({ color: 0xd2d2d2, transparent: true, opacity: 0.03 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    line.frustumCulled = false;
    root.add(line);
    strands.push({ line, material: mat, baseOpacity: 0.03 });
  }

  return {
    strands,
    weightFn(intensities) {
      const keys = options.keys ?? [];
      let sum = 0;
      let n = 0;
      for (const key of keys) {
        const v = intensities.get(key);
        if (v !== undefined) {
          sum += v;
          n += 1;
        }
      }
      return n ? (sum / n) : 0;
    }
  };
}

function hash3D(x, y, z, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 91.13) * 43758.5453123;
  return s - Math.floor(s);
}

function smooth01(t) {
  return t * t * (3 - 2 * t);
}

function lerp01(a, b, t) {
  return a + (b - a) * t;
}

function valueNoise3D(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;

  const u = smooth01(xf);
  const v = smooth01(yf);
  const w = smooth01(zf);

  const n000 = hash3D(xi, yi, zi, seed);
  const n100 = hash3D(xi + 1, yi, zi, seed);
  const n010 = hash3D(xi, yi + 1, zi, seed);
  const n110 = hash3D(xi + 1, yi + 1, zi, seed);
  const n001 = hash3D(xi, yi, zi + 1, seed);
  const n101 = hash3D(xi + 1, yi, zi + 1, seed);
  const n011 = hash3D(xi, yi + 1, zi + 1, seed);
  const n111 = hash3D(xi + 1, yi + 1, zi + 1, seed);

  const x00 = lerp01(n000, n100, u);
  const x10 = lerp01(n010, n110, u);
  const x01 = lerp01(n001, n101, u);
  const x11 = lerp01(n011, n111, u);
  const y0 = lerp01(x00, x10, v);
  const y1 = lerp01(x01, x11, v);
  return lerp01(y0, y1, w);
}

function fbm3D(x, y, z, seed, octaves) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise3D(x * frequency, y * frequency, z * frequency, seed + i * 13.7) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return norm > 0 ? value / norm : 0;
}

function createFallback2D() {
  const ctx = dom.canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const points = new Map([
    ["Thalamus", [0.5, 0.54]],
    ["STG L", [0.34, 0.35]],
    ["STG R", [0.66, 0.35]],
    ["DLPFC L", [0.37, 0.2]],
    ["DLPFC R", [0.63, 0.2]],
    ["ACC", [0.5, 0.27]],
    ["Hippocampus L", [0.42, 0.75]],
    ["Hippocampus R", [0.58, 0.75]],
    ["Septum", [0.5, 0.88]]
  ]);

  function resize() {
    const w = dom.canvas.clientWidth;
    const h = dom.canvas.clientHeight;
    dom.canvas.width = Math.floor(w * dpr);
    dom.canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  return {
    label: "2D",
    tick(cycleMs, intensities) {
      const w = dom.canvas.clientWidth;
      const h = dom.canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.39, h * 0.52, w * 0.25, h * 0.31, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.61, h * 0.52, w * 0.25, h * 0.31, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      drawLink(ctx, points.get("Thalamus"), points.get("STG L"), w, h);
      drawLink(ctx, points.get("Thalamus"), points.get("STG R"), w, h);
      drawLink(ctx, points.get("STG L"), points.get("DLPFC L"), w, h);
      drawLink(ctx, points.get("STG R"), points.get("DLPFC R"), w, h);
      drawLink(ctx, points.get("STG L"), points.get("Hippocampus L"), w, h);
      drawLink(ctx, points.get("STG R"), points.get("Hippocampus R"), w, h);
      drawLink(ctx, points.get("Septum"), points.get("Hippocampus L"), w, h);
      drawLink(ctx, points.get("Septum"), points.get("Hippocampus R"), w, h);

      const activity = {
        "Thalamus": intensities.get("thalamus") ?? 0,
        "STG L": intensities.get("stgL") ?? 0,
        "STG R": intensities.get("stgR") ?? 0,
        "DLPFC L": intensities.get("dlpfcL") ?? 0,
        "DLPFC R": intensities.get("dlpfcR") ?? 0,
        "ACC": intensities.get("acc") ?? 0,
        "Hippocampus L": intensities.get("hippoL") ?? 0,
        "Hippocampus R": intensities.get("hippoR") ?? 0,
        "Septum": intensities.get("septum") ?? 0
      };

      for (const [label, p] of points.entries()) {
        const active = clamp(activity[label] / 1.1, 0, 1);
        drawNode(ctx, label, p[0] * w, p[1] * h, active);
      }

      ctx.fillStyle = "#c9c9c9";
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.fillText("2D fallback mode", 16, h - 20);
      ctx.fillText(`Cycle: ${Math.round(cycleMs)} ms`, 16, h - 38);
    }
  };
}

function drawLink(ctx, p0, p1, w, h) {
  ctx.beginPath();
  ctx.moveTo(p0[0] * w, p0[1] * h);
  ctx.lineTo(p1[0] * w, p1[1] * h);
  ctx.stroke();
}

function drawNode(ctx, label, x, y, activity) {
  const r = 18 + activity * 14;
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
  glow.addColorStop(0, `rgba(255,255,255,${0.2 + activity * 0.7})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(155,155,155,${0.45 + activity * 0.5})`;
  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f4f4f4";
  ctx.font = "600 11px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 3);
}

function frame(now) {
  const dt = now - previousFrame;
  previousFrame = now;
  if (state.running) {
    state.simTimeMs += dt * state.speed;
  }
  const cycleMs = state.simTimeMs % CYCLE_MS;
  const intensities = computeIntensities(cycleMs);
  updateReadouts(intensities, cycleMs);
  drawWaveform(cycleMs);
  engine.tick(cycleMs, intensities);
  requestAnimationFrame(frame);
}

function computeIntensities(cycleMs) {
  const map = new Map();
  const modeDefault = state.mode === "normal" ? 0.35 : 0.85;
  const ratioScale = state.ratio / modeDefault;

  for (const def of regionDefs) {
    const baseS2 = state.mode === "normal" ? def.s2.normal : def.s2.impaired;
    const s2Factor = clamp(baseS2 * ratioScale, 0.1, 1.2);
    const s1 = gauss(cycleMs, def.peakMs, def.widthMs);
    const s2 = gauss(cycleMs, def.peakMs + S2_DELAY_MS, def.widthMs) * s2Factor;
    const ctrl = isControlRegion(def.id)
      ? (gauss(cycleMs, 132, 44) + gauss(cycleMs, 132 + S2_DELAY_MS, 44) * (state.mode === "normal" ? 1.0 : 0.62)) * 0.36
      : 0;
    map.set(def.id, clamp(s1 + s2 + ctrl, 0, 1.35));
  }
  return map;
}

function isControlRegion(id) {
  return id.startsWith("dlpfc") || id === "acc" || id.startsWith("claustrum");
}

function updateReadouts(intensities, cycleMs) {
  const phase = phaseLabel(cycleMs);
  dom.phase.textContent = phase;
  dom.timelineReadout.textContent =
    `Cycle phase: ${phase} | ${Math.round(cycleMs)} ms | S1=0 ms, S2=500 ms | Renderer: ${state.rendererMode}`;

  const suppressionPct = Math.round((1 - state.ratio) * 100);
  dom.suppression.textContent = `${suppressionPct}% (S2/S1 = ${state.ratio.toFixed(2)})`;

  const active = [...intensities.entries()]
    .filter(([, value]) => value > 0.15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, value]) => `${regionDefs.find((r) => r.id === key).name} (${(value * 100).toFixed(0)}%)`);
  dom.activeRegions.textContent = active.length ? active.join(", ") : "Baseline recovery";

  const neuronClasses = [];
  if ((intensities.get("thalamus") ?? 0) > 0.2) neuronClasses.push("thalamocortical relay");
  if ((intensities.get("stgL") ?? 0) > 0.2 || (intensities.get("stgR") ?? 0) > 0.2) neuronClasses.push("cortical pyramidal");
  if ((intensities.get("hippoL") ?? 0) > 0.2 || (intensities.get("hippoR") ?? 0) > 0.2) neuronClasses.push("CA3 pyramidal");
  if ((intensities.get("acc") ?? 0) > 0.2 || (intensities.get("dlpfcL") ?? 0) > 0.2 || (intensities.get("dlpfcR") ?? 0) > 0.2) {
    neuronClasses.push("GABA interneuron recruitment");
  }
  if ((intensities.get("septum") ?? 0) > 0.15) neuronClasses.push("cholinergic septohippocampal");
  dom.activeNeurons.textContent = neuronClasses.length ? neuronClasses.join(", ") : "low-activity baseline";

  const thalamic = clamp(intensities.get("thalamus") ?? 0, 0, 1) * 100;
  const cortical = clamp(mean([
    intensities.get("stgL") ?? 0,
    intensities.get("stgR") ?? 0,
    intensities.get("dlpfcL") ?? 0,
    intensities.get("dlpfcR") ?? 0,
    intensities.get("acc") ?? 0,
    intensities.get("insulaL") ?? 0,
    intensities.get("insulaR") ?? 0
  ]), 0, 1) * 100;
  const ca3 = clamp(mean([intensities.get("hippoL") ?? 0, intensities.get("hippoR") ?? 0]), 0, 1) * 100;
  const gaba = clamp(mean([
    intensities.get("acc") ?? 0,
    intensities.get("dlpfcL") ?? 0,
    intensities.get("dlpfcR") ?? 0,
    intensities.get("claustrumL") ?? 0,
    intensities.get("claustrumR") ?? 0
  ]) * (state.mode === "normal" ? 1.08 : 0.86), 0, 1) * 100;
  const chol = clamp(intensities.get("septum") ?? 0, 0, 1) * 100;

  dom.thalamicPop.textContent = `${thalamic.toFixed(0)}%`;
  dom.corticalPop.textContent = `${cortical.toFixed(0)}%`;
  dom.ca3Pop.textContent = `${ca3.toFixed(0)}%`;
  dom.gabaPop.textContent = `${gaba.toFixed(0)}%`;
  dom.cholinergicPop.textContent = `${chol.toFixed(0)}%`;
}

function phaseLabel(cycleMs) {
  if (cycleMs < 40) return "Pre-stimulus baseline";
  if (cycleMs < 95) return "S1 early cortical registration (~50 ms)";
  if (cycleMs < 185) return "S1 inhibitory recruitment (fronto-cingulate)";
  if (cycleMs < 340) return "Late hippocampal gating (~250 ms window)";
  if (cycleMs < 500) return "Inter-stimulus recovery";
  if (cycleMs < 590) return "S2 registration (suppressed if gating is intact)";
  if (cycleMs < 720) return "S2 inhibitory follow-through";
  if (cycleMs < 880) return "Late hippocampal check";
  return "Pair-recovery before next trial";
}

function drawWaveform(cycleMs) {
  const canvas = dom.waveform;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 9) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += h / 5) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  drawP50Window(ctx, 30, 80, "rgba(255,255,255,0.07)", w, h);
  drawP50Window(ctx, 530, 580, "rgba(255,255,255,0.07)", w, h);

  const altRatio = state.mode === "normal" ? 0.85 : 0.35;
  drawErpTrace(ctx, altRatio, "#737373", [5, 4], w, h);
  drawErpTrace(ctx, state.ratio, "#ffffff", [], w, h);

  const chartMs = cycleMs % 900;
  const xNow = (chartMs / 900) * w;
  ctx.strokeStyle = "#c9c9c9";
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(xNow, 0);
  ctx.lineTo(xNow, h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#cccccc";
  ctx.font = "12px 'IBM Plex Mono'";
  ctx.fillText("0 ms (S1)", 8, 14);
  ctx.fillText("500 ms (S2)", (500 / 900) * w + 6, 14);
}

function drawP50Window(ctx, startMs, endMs, color, width, height) {
  const x0 = (startMs / 900) * width;
  const x1 = (endMs / 900) * width;
  ctx.fillStyle = color;
  ctx.fillRect(x0, 0, x1 - x0, height);
}

function drawErpTrace(ctx, ratio, stroke, dash, width, height) {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.setLineDash(dash);
  ctx.beginPath();
  for (let ms = 0; ms <= 900; ms += 2) {
    const amp = erpValue(ms, ratio);
    const x = (ms / 900) * width;
    const y = height * 0.67 - amp * 85;
    if (ms === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function erpValue(ms, ratio) {
  const n40 = -0.18 * gauss(ms, 37, 10) - 0.15 * ratio * gauss(ms, 537, 10);
  const p50 = 0.96 * gauss(ms, 53, 13) + (0.96 * ratio) * gauss(ms, 553, 13);
  const hippocampalLate = 0.22 * gauss(ms, 250, 36) + (0.22 * ratio * 0.9) * gauss(ms, 750, 36);
  return n40 + p50 + hippocampalLate;
}

function wireControls() {
  dom.mode.addEventListener("change", (event) => {
    state.mode = event.target.value;
    if (state.mode === "normal" && state.ratio > 0.6) {
      state.ratio = 0.35;
      dom.ratio.value = "0.35";
    }
    if (state.mode === "impaired" && state.ratio < 0.6) {
      state.ratio = 0.85;
      dom.ratio.value = "0.85";
    }
    updateControlLabels();
  });

  dom.ratio.addEventListener("input", () => {
    state.ratio = Number(dom.ratio.value);
    updateControlLabels();
  });

  dom.speed.addEventListener("input", () => {
    state.speed = Number(dom.speed.value);
    updateControlLabels();
  });

  dom.toggle.addEventListener("click", () => {
    state.running = !state.running;
    dom.toggle.textContent = state.running ? "Pause" : "Resume";
  });

  dom.restart.addEventListener("click", () => {
    state.simTimeMs = 0;
  });
}

function updateControlLabels() {
  dom.ratioValue.textContent = state.ratio.toFixed(2);
  dom.speedValue.textContent = `${state.speed.toFixed(1)}x`;
}

function gauss(x, mean, sigma) {
  const z = (x - mean) / sigma;
  return Math.exp(-0.5 * z * z);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
