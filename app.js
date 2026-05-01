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
const heroicDevice = document.querySelector(".heroic-device");
const matureVisual = document.querySelector(".mature-visual img");
let manifestoProgress = 0;

const smoothValue = (edge0, edge1, value) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

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
  updateScrollVisuals();
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
    let visibility = Math.max(0, 1 - Math.max(0, distance - crispHold) / fadeWidth);
    const direction = index - exact;
    let blur = 38 * Math.pow(1 - visibility, 1.25);
    let y = direction * 42;
    let z = -150 * (1 - visibility);
    let scale = 0.95 + visibility * 0.05;
    let rotate = direction * 5;

    if (index === manifestoLines.length - 1 && exact > manifestoLines.length - 2.2) {
      const heroProgress = sectionProgress(heroicDevice?.closest(".heroic-showcase"));
      const fadeAfterCross = smoothValue(0.5, 0.78, heroProgress);
      visibility = 1 - fadeAfterCross;
      blur = 32 * fadeAfterCross;
      y = -8 * heroProgress;
      z = 0;
      scale = 1;
      rotate = 0;
    }

    line.classList.toggle("is-active", distance <= crispHold);
    line.style.opacity = visibility.toFixed(3);
    line.style.filter = `blur(${blur.toFixed(2)}px)`;
    line.style.transform = `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) scale(${scale.toFixed(3)}) rotateX(${rotate.toFixed(2)}deg)`;
  });

  manifestoAssets.forEach((asset, index) => {
    const assetTargets = [0.09, 0.29, 0.49, 0.68, 0.86];
    const target = assetTargets[index] ?? (index + 1) / (manifestoAssets.length + 1);
    const distance = Math.abs(manifestoProgress - target);
    const sharpHold = 0.075;
    const fadeWidth = 0.16;
    const visibility = Math.max(0, 1 - Math.max(0, distance - sharpHold) / fadeWidth);
    const drift = (manifestoProgress * 2 - 1) * 80;
    const side = index % 2 === 0 ? -1 : 1;

    asset.style.setProperty("--asset-opacity", (visibility * 0.9).toFixed(3));
    asset.style.setProperty("--asset-blur", `${(18 * Math.pow(1 - visibility, 1.35)).toFixed(2)}px`);
    asset.style.setProperty("--asset-scale", (0.86 + visibility * 0.3).toFixed(3));
    asset.style.setProperty("--asset-x", `${(side * (1 - visibility) * 120 + drift * side * 0.2).toFixed(2)}px`);
    asset.style.setProperty("--asset-y", `${((1 - visibility) * 100 - visibility * 18).toFixed(2)}px`);
    asset.style.setProperty("--asset-rotate", `${(side * (8 - visibility * 10)).toFixed(2)}deg`);
  });
}

function sectionProgress(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const travel = Math.max(1, window.innerHeight + rect.height);
  return Math.min(1, Math.max(0, (window.innerHeight - rect.top) / travel));
}

function isSectionActive(element, offset = 0) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight - offset && rect.bottom > offset;
}

function updateScrollVisuals() {
  if (heroicDevice) {
    const progress = sectionProgress(heroicDevice.closest(".heroic-showcase"));
    const eased = 1 - Math.pow(1 - progress, 2.2);
    root.style.setProperty("--heroic-scale", (0.78 + eased * 0.42).toFixed(3));
    root.style.setProperty("--heroic-x", `${((0.5 - progress) * 6).toFixed(2)}vw`);
    root.style.setProperty("--heroic-y", `${((1 - progress) * 62 - 30).toFixed(2)}vh`);
    root.style.setProperty("--heroic-rotate", `${(-4 + progress * 7).toFixed(2)}deg`);
  }

  if (matureVisual) {
    const progress = sectionProgress(matureVisual.closest(".mature-visual"));
    const focus = 44 + progress * 16 + pointer.nx * 3;
    root.style.setProperty("--mature-focus-x", `${focus.toFixed(2)}%`);
    root.style.setProperty("--mature-x", `${((0.5 - progress) * 4).toFixed(2)}vw`);
    root.style.setProperty("--mature-y", `${((0.5 - progress) * 10).toFixed(2)}vh`);
    root.style.setProperty("--mature-scale", (1.08 + progress * 0.12).toFixed(3));
    root.style.setProperty("--mature-radar", (0.35 + progress * 0.45).toFixed(3));
    root.style.setProperty("--mature-radar-scale", (0.82 + progress * 0.44).toFixed(3));
    root.style.setProperty("--mature-card-y", `${((0.5 - progress) * 28).toFixed(2)}px`);
  }
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

const mapProvider = document.querySelector("[data-map-provider]");
const mapDetail = document.querySelector("[data-map-detail]");

document.querySelectorAll(".map-pin").forEach((pin) => {
  pin.addEventListener("click", () => {
    document.querySelectorAll(".map-pin").forEach((item) => item.classList.remove("is-selected"));
    pin.classList.add("is-selected");
    if (mapProvider) mapProvider.textContent = pin.dataset.providerName || pin.textContent.trim();
    if (mapDetail) mapDetail.textContent = pin.dataset.providerDetail || "";
  });
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

  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const glowContext = glowCanvas.getContext("2d");
  const glowGradient = glowContext.createRadialGradient(128, 128, 4, 128, 128, 128);
  glowGradient.addColorStop(0, "rgba(255, 42, 18, 1)");
  glowGradient.addColorStop(0.24, "rgba(255, 31, 18, 0.72)");
  glowGradient.addColorStop(0.56, "rgba(255, 24, 18, 0.22)");
  glowGradient.addColorStop(1, "rgba(255, 24, 18, 0)");
  glowContext.fillStyle = glowGradient;
  glowContext.fillRect(0, 0, 256, 256);
  const redGlowTexture = new THREE.CanvasTexture(glowCanvas);
  const redGlowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: redGlowTexture,
      color: 0xff1508,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  redGlowSprite.position.set(0, -0.36, 0.82);
  redGlowSprite.scale.set(0.7, 0.7, 0.7);

  const loader = new GLTFLoader();
  let modelLoaded = false;
  const redMaterials = [];
  const glowMaterials = [];

  const softenMaterial = (material) => {
    if (!material) return;
    material.flatShading = false;
    material.roughness = Math.max(material.roughness ?? 0.45, 0.58);
    material.metalness = Math.min(material.metalness ?? 0.1, 0.18);

    if (material.normalScale) material.normalScale.set(0.055, 0.055);
    if ("bumpScale" in material) material.bumpScale = 0.004;

    material.envMapIntensity = 0.72;
    const color = material.color;
    const isRedMaterial = color && color.r > color.g * 1.35 && color.r > color.b * 1.35;
    if ("emissive" in material) {
      glowMaterials.push(material);
      if (isRedMaterial) {
        material.emissive.setRGB(0.95, 0.05, 0.02);
        redMaterials.push(material);
      }
    }
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
      model.scale.setScalar(1.45 / Math.max(size.x, size.y, size.z));

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
      group.add(redGlowSprite);
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
  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smoothstep = (edge0, edge1, value) => {
    const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => a + (b - a) * t;

  const animate = (time = 0) => {
    raf = requestAnimationFrame(animate);
    const viewportProgress = window.scrollY / Math.max(1, window.innerHeight);
    const mobile = window.innerWidth < 680;
    const heroicSection = document.querySelector(".heroic-showcase");
    const matureSection = document.querySelector(".mature-visual");
    const inHeroic = isSectionActive(heroicSection, window.innerHeight * 0.08);
    const inMature = isSectionActive(matureSection, window.innerHeight * 0.12);
    const inManifesto = manifesto
      ? manifesto.getBoundingClientRect().top < window.innerHeight &&
        manifesto.getBoundingClientRect().bottom > 0
      : false;

    const manifestoTravel = smoothstep(0.14, 0.86, manifestoProgress);
    const manifestoPresence = inManifesto ? smoothstep(0.08, 0.2, manifestoProgress) * (1 - smoothstep(0.84, 0.96, manifestoProgress)) : 0;
    const matureProgress = sectionProgress(matureSection);
    const matureTravel = smoothstep(0.12, 0.9, matureProgress);
    const maturePresence = inMature ? smoothstep(0.08, 0.22, matureProgress) * (1 - smoothstep(0.84, 0.98, matureProgress)) : 0;
    const heroPresence = peak(viewportProgress, 0.2, 0.42) * 0.5;
    const heroicSuppression = inHeroic ? 1 - smoothstep(0.02, 0.16, sectionProgress(heroicSection)) * (1 - smoothstep(0.86, 0.98, sectionProgress(heroicSection))) : 1;
    const presence = Math.min(0.96, Math.max(heroPresence, manifestoPresence * 0.88, maturePresence * 0.92) * heroicSuppression);
    const frontLayer = (inManifesto && manifestoPresence > 0.08) || (inMature && maturePresence > 0.08);
    const modelOpacity = presence > 0.16 ? Math.min(1, 0.78 + presence * 0.32) : presence * 2.2;
    root.style.setProperty("--model-presence", presence.toFixed(3));
    root.style.setProperty("--model-opacity", modelOpacity.toFixed(3));
    root.style.setProperty("--model-layer", frontLayer ? "4" : "-2");
    const visibleBlur = presence > 0.12 ? 0 : 10 * (1 - presence);
    root.style.setProperty("--model-blur", `${visibleBlur.toFixed(2)}px`);

    let targetX = mobile ? 1.8 : 3.8;
    let targetY = mobile ? 0.35 : 0.15;
    let targetRotY = Math.PI * 0.35;
    let targetRotX = -0.12 + pointer.ny * 0.08;
    let targetRotZ = pointer.nx * -0.04;

    if (inManifesto) {
      targetX = mix(mobile ? -1.8 : -3.0, mobile ? 1.8 : 3.0, manifestoTravel);
      targetY = mix(0.34, -0.18, manifestoTravel) + Math.sin(manifestoTravel * Math.PI) * 0.34;
      targetRotY = mix(-Math.PI * 0.9, Math.PI * 1.1, manifestoTravel);
      targetRotX = -0.18 + Math.sin(manifestoTravel * Math.PI) * 0.28;
      targetRotZ = mix(-0.2, 0.22, manifestoTravel);
    } else if (inHeroic) {
      targetX = mobile ? 2.4 : 4.2;
      targetY = 0.42;
      targetRotY = Math.PI * 1.15;
      targetRotX = -0.1;
      targetRotZ = 0.12;
    } else if (inMature) {
      targetX = mix(mobile ? 2.1 : 3.3, mobile ? -2.1 : -3.3, matureTravel);
      targetY = mix(-0.26, 0.28, matureTravel) + Math.sin(matureTravel * Math.PI) * -0.24;
      targetRotY = mix(Math.PI * 1.1, Math.PI * 3.25, matureTravel);
      targetRotX = -0.22 + Math.sin(matureTravel * Math.PI * 1.2) * 0.34;
      targetRotZ = mix(0.22, -0.26, matureTravel);
    }

    group.rotation.y += (targetRotY - group.rotation.y) * 0.035;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.035;
    group.rotation.z += (targetRotZ - group.rotation.z) * 0.035;
    group.position.x += (targetX - group.position.x) * 0.035;
    group.position.y += (targetY - group.position.y) * 0.035;

    const scale = (mobile ? 0.33 : 0.39) + presence * (mobile ? 0.1 : 0.13);
    group.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.035);

    const facingCamera = Math.pow((Math.cos(group.rotation.y) + 1) / 2, 2.4);
    const redGlow = presence * (1.6 + facingCamera * 14);
    redPulse.intensity += (redGlow - redPulse.intensity) * 0.06;
    const spriteGlow = presence * (0.16 + facingCamera * 0.84);
    redGlowSprite.material.opacity += (spriteGlow - redGlowSprite.material.opacity) * 0.08;
    const spriteScale = 0.42 + facingCamera * presence * 0.72;
    redGlowSprite.scale.lerp(new THREE.Vector3(spriteScale, spriteScale, spriteScale), 0.08);
    redGlowSprite.position.set(0, -0.36, 0.82 + facingCamera * 0.08);
    redMaterials.forEach((material) => {
      material.emissiveIntensity = 0.45 + facingCamera * presence * 4.4;
    });
    if (!redMaterials.length) {
      glowMaterials.forEach((material) => {
        material.emissive.setRGB(0.45, 0.02, 0.01);
        material.emissiveIntensity = facingCamera * presence * 0.9;
      });
    }
    redPulse.position.set(
      group.position.x + Math.sin(group.rotation.y) * 0.8,
      group.position.y - 0.25,
      2.2 + Math.cos(group.rotation.y) * 0.7,
    );
    redPulse.color.setRGB(1, 0.05 + facingCamera * 0.12, 0.02);
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
