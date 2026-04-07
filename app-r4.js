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
  scene.background = new THREE.Color(0x020202);
  scene.fog = new THREE.Fog(0x020202, 16, 34);

  const camera = new THREE.PerspectiveCamera(
    47,
    dom.canvas.clientWidth / Math.max(1, dom.canvas.clientHeight),
    0.1,
    100
  );
  camera.position.set(0, 3.0, 18.4);

  const renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(dom.canvas.clientWidth, dom.canvas.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x020202, 1);

  const amb = new THREE.AmbientLight(0xffffff, 0.34);
  scene.add(amb);

  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(6, 8, 7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbcbcbc, 0.45);
  fill.position.set(-7, 3, -5);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });

  const hemiGeo = new THREE.SphereGeometry(4.85, 52, 36);
  const left = new THREE.Mesh(hemiGeo, shellMaterial.clone());
  left.position.set(-2.8, 0.3, 0);
  left.scale.set(1.25, 1.0, 1.07);
  root.add(left);
  const leftEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hemiGeo, 32),
    new THREE.LineBasicMaterial({ color: 0x3f3f3f, transparent: true, opacity: 0.4 })
  );
  leftEdges.position.copy(left.position);
  leftEdges.scale.copy(left.scale);
  root.add(leftEdges);

  const right = new THREE.Mesh(hemiGeo, shellMaterial.clone());
  right.position.set(2.8, 0.3, 0);
  right.scale.set(1.25, 1.0, 1.07);
  root.add(right);
  const rightEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(hemiGeo, 32),
    new THREE.LineBasicMaterial({ color: 0x3f3f3f, transparent: true, opacity: 0.4 })
  );
  rightEdges.position.copy(right.position);
  rightEdges.scale.copy(right.scale);
  root.add(rightEdges);

  const bridge = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 36, 24),
    new THREE.MeshStandardMaterial({
      color: 0x131313,
      roughness: 0.92,
      metalness: 0.0,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    })
  );
  bridge.position.set(0, 0.2, -0.1);
  bridge.scale.set(1.2, 0.9, 0.9);
  root.add(bridge);

  const regionLayout = {
    thalamus: [0, -0.8, 0.5],
    stgL: [-5.5, 0.8, 1.1],
    stgR: [5.5, 0.8, 1.1],
    dlpfcL: [-4.4, 3.2, 2.2],
    dlpfcR: [4.4, 3.2, 2.2],
    acc: [0, 2.4, 1.8],
    insulaL: [-3.8, 0.1, 0.8],
    insulaR: [3.8, 0.1, 0.8],
    claustrumL: [-3.0, -0.2, 0.35],
    claustrumR: [3.0, -0.2, 0.35],
    hippoL: [-2.5, -2.1, -1.6],
    hippoR: [2.5, -2.1, -1.6],
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
        color: 0x5a5a5a,
        emissive: 0x1a1a1a,
        emissiveIntensity: 0.25,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );
    regionGroup.add(body);

    const neuronCount = 95;
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
        size: 0.055,
        transparent: true,
        opacity: 0.62,
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
      new THREE.LineBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.18 })
    );
    root.add(line);
    lineSet.push({ a, b, line });
  }

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

      for (const [id, mesh] of regionMeshes.entries()) {
        const val = clamp((intensities.get(id) ?? 0) / 1.1, 0, 1);
        mesh.body.material.emissiveIntensity = 0.1 + val * 1.8;
        mesh.body.material.opacity = 0.38 + val * 0.56;
        mesh.group.scale.setScalar(1 + val * 0.14);
        mesh.cloud.material.opacity = 0.18 + val * 0.8;
        mesh.cloud.material.size = 0.025 + val * 0.09;
      }

      for (const edge of lineSet) {
        const val = ((intensities.get(edge.a) ?? 0) + (intensities.get(edge.b) ?? 0)) * 0.5;
        edge.line.material.opacity = 0.05 + clamp(val, 0, 1) * 0.5;
      }

      renderer.render(scene, camera);
    }
  };
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
