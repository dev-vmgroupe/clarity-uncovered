import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { mergeVertices } from "./utils/BufferGeometryUtils.js";

const root = document.documentElement;
const body = document.body;
const canvas = document.querySelector("#device-canvas");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  nx: 0,
  ny: 0,
};

const manifesto = document.querySelector(".manifesto");
const manifestoLines = [...document.querySelectorAll(".manifesto-lines span")];
const manifestoAssets = [...document.querySelectorAll(".manifesto-assets img")];
let manifestoProgress = 0;

const setPointer = (x, y) => {
  pointer.x = x;
  pointer.y = y;
  pointer.nx = (x / window.innerWidth - 0.5) * 2;
  pointer.ny = (y / window.innerHeight - 0.5) * 2;
  root.style.setProperty("--mx", `${x}px`);
  root.style.setProperty("--my", `${y}px`);
};

setPointer(pointer.x, pointer.y);

window.addEventListener(
  "pointermove",
  (event) => {
    setPointer(event.clientX, event.clientY);
  },
  { passive: true },
);

document.querySelectorAll("a, button, .flip-card").forEach((item) => {
  item.addEventListener("pointerenter", () => root.style.setProperty("--cursor-scale", "2.6"));
  item.addEventListener("pointerleave", () => root.style.setProperty("--cursor-scale", "1"));
});

const updateScroll = () => {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  root.style.setProperty("--scroll", `${window.scrollY / scrollable}`);
  updateManifesto();
};

updateScroll();
window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("resize", updateScroll);
window.addEventListener("load", updateScroll);
window.addEventListener("hashchange", () => requestAnimationFrame(updateScroll));
setTimeout(updateScroll, 250);

function updateManifesto() {
  if (!manifesto || !manifestoLines.length) return;

  const rect = manifesto.getBoundingClientRect();
  const travel = Math.max(1, manifesto.offsetHeight - window.innerHeight);
  manifestoProgress = Math.min(1, Math.max(0, -rect.top / travel));
  const exact = manifestoProgress * (manifestoLines.length - 1);

  manifestoLines.forEach((line, index) => {
    const distance = Math.abs(index - exact);
    const crispHold = 0.38;
    const fadeWidth = 0.28;
    const visibility = Math.max(0, 1 - Math.max(0, distance - crispHold) / fadeWidth);
    const direction = index - exact;
    const blur = 38 * Math.pow(1 - visibility, 1.25);
    const y = direction * 42;
    const z = -150 * (1 - visibility);
    const scale = 0.95 + visibility * 0.05;
    const rotate = direction * 5;

    line.classList.toggle("is-active", distance <= crispHold);
    line.style.opacity = visibility.toFixed(3);
    line.style.filter = `blur(${blur.toFixed(2)}px)`;
    line.style.transform = `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) scale(${scale.toFixed(3)}) rotateX(${rotate.toFixed(2)}deg)`;
  });

  manifestoAssets.forEach((asset, index) => {
    const assetTargets = [0.1, 0.33, 0.58, 0.82];
    const target = assetTargets[index] ?? (index + 1) / (manifestoAssets.length + 1);
    const windowWidth = 0.14;
    const distance = Math.abs(manifestoProgress - target);
    const visibility = Math.max(0, 1 - distance / windowWidth);
    const drift = (manifestoProgress * 2 - 1) * 80;
    const side = index % 2 === 0 ? -1 : 1;

    asset.style.setProperty("--asset-opacity", (visibility * 0.84).toFixed(3));
    asset.style.setProperty("--asset-blur", `${(24 * (1 - visibility)).toFixed(2)}px`);
    asset.style.setProperty("--asset-scale", (0.82 + visibility * 0.34).toFixed(3));
    asset.style.setProperty("--asset-x", `${(side * (1 - visibility) * 150 + drift * side * 0.24).toFixed(2)}px`);
    asset.style.setProperty("--asset-y", `${((1 - visibility) * 130 - visibility * 26).toFixed(2)}px`);
    asset.style.setProperty("--asset-rotate", `${(side * (10 - visibility * 13)).toFixed(2)}deg`);
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { rootMargin: "0px 0px -12% 0px", threshold: 0.12 },
);

document.querySelectorAll(".process-step").forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 520)}ms`;
  revealObserver.observe(item);
});

document.querySelectorAll(".flip-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(max-width: 640px)").matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${y * -8}deg) rotateY(${x * 10}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });

  card.addEventListener("click", () => {
    if (window.matchMedia("(hover: none)").matches) card.classList.toggle("is-open");
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.classList.toggle("is-open");
    }
  });
});

document.querySelectorAll(".accordion-item").forEach((item) => {
  item.addEventListener("click", () => item.classList.toggle("is-open"));
});

document.querySelectorAll(".magnetic").forEach((item) => {
  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    item.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
  });

  item.addEventListener("pointerleave", () => {
    item.style.transform = "";
  });
});

const createDeviceScene = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.1, 9.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;

  const group = new THREE.Group();
  scene.add(group);

  const ambient = new THREE.HemisphereLight(0xd5edf1, 0x00415f, 2.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(2.5, 4, 5);
  scene.add(key);

  const rim = new THREE.PointLight(0x127ba9, 9, 14);
  rim.position.set(-3.5, 1.5, 2.5);
  scene.add(rim);

  const redPulse = new THREE.PointLight(0x90111a, 6, 8);
  redPulse.position.set(0, -1, 2);
  scene.add(redPulse);

  const loader = new GLTFLoader();
  let modelLoaded = false;

  const softenMaterial = (material) => {
    if (!material) return;
    material.flatShading = false;
    material.roughness = Math.max(material.roughness ?? 0.45, 0.58);
    material.metalness = Math.min(material.metalness ?? 0.1, 0.18);

    if (material.normalScale) material.normalScale.set(0.055, 0.055);
    if ("bumpScale" in material) material.bumpScale = 0.004;

    material.envMapIntensity = 0.72;
    material.needsUpdate = true;
  };

  loader.load(
    "./3d/Meshy_AI_Red_LED_Medical_Strob_0501200944_texture.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);
      model.scale.setScalar(2.1 / Math.max(size.x, size.y, size.z));

      model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry?.attributes?.position) {
            const welded = mergeVertices(child.geometry.clone(), 0.006);
            welded.computeVertexNormals();
            child.geometry = welded;
          }

          child.castShadow = true;
          child.receiveShadow = true;
          if (Array.isArray(child.material)) child.material.forEach(softenMaterial);
          else softenMaterial(child.material);
        }
      });

      group.add(model);
      modelLoaded = true;
      canvas.classList.add("is-loaded");
    },
    undefined,
    () => {
      canvas.classList.remove("is-loaded");
    },
  );

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("resize", onResize);

  let raf = 0;
  const peak = (progress, target, width) =>
    Math.exp(-Math.pow((progress - target) / width, 2));

  const animate = (time = 0) => {
    raf = requestAnimationFrame(animate);
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = window.scrollY / scrollable;
    const viewportProgress = window.scrollY / Math.max(1, window.innerHeight);
    const mobile = window.innerWidth < 680;
    const inManifesto = manifesto
      ? manifesto.getBoundingClientRect().top < window.innerHeight &&
        manifesto.getBoundingClientRect().bottom > 0
      : false;
    const linePulse = inManifesto
      ? peak((manifestoProgress * manifestoLines.length) % 1, 0.5, 0.34) * 0.52
      : 0;
    const heroPresence = peak(viewportProgress, 0.18, 0.52) * 0.82;
    const presence = Math.min(
      0.92,
      heroPresence +
        linePulse +
        peak(progress, 0.7, 0.055) * 0.48,
    );
    root.style.setProperty("--model-presence", presence.toFixed(3));
    root.style.setProperty("--model-blur", `${((1 - presence) * 18).toFixed(2)}px`);

    group.rotation.y += ((progress * Math.PI * 5.2 + pointer.nx * 0.16) - group.rotation.y) * 0.048;
    group.rotation.x += ((-0.12 + pointer.ny * 0.1 + progress * 0.32) - group.rotation.x) * 0.048;
    group.rotation.z += ((pointer.nx * -0.05 + Math.sin(time * 0.00045) * 0.025) - group.rotation.z) * 0.048;
    group.position.x +=
      (((mobile ? 0 : 0.9) * Math.sin(progress * Math.PI * 2.8) +
        (1 - presence) * (mobile ? 0.75 : 1.35) -
        pointer.nx * 0.08) -
        group.position.x) *
      0.04;
    group.position.y +=
      ((0.05 + Math.sin(time * 0.001 + progress * 8) * 0.12 - presence * 0.18) - group.position.y) *
      0.04;

    const scale = (mobile ? 0.5 : 0.66) + presence * (mobile ? 0.2 : 0.24);
    group.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.045);

    redPulse.intensity = presence * (3.4 + Math.sin(time * 0.004) * 1.2);
    rim.position.x = -3.5 + pointer.nx * 1.5;
    rim.position.y = 1.5 - pointer.ny * 1.2;

    if (modelLoaded) renderer.render(scene, camera);
  };

  if (!prefersReducedMotion) animate();
  else renderer.render(scene, camera);

  return () => cancelAnimationFrame(raf);
};

if (canvas && !prefersReducedMotion) {
  createDeviceScene();
}
