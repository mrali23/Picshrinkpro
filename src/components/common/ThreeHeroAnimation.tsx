import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function ThreeHeroAnimation() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL safely
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 340;

    // 2. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 5.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x3b82f6, 2.5); // Warm blue
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xec4899, 1.8); // Pink rim
    rimLight.position.set(-4, -2, -2);
    scene.add(rimLight);

    // 5. Procedural Composite 3D Models (Floating Image Cards & Optical Glass Lens)
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Main Card (Photo Card with Beveled Frame)
    const cardGroup = new THREE.Group();
    masterGroup.add(cardGroup);

    // Frame outer
    const frameGeo = new THREE.BoxGeometry(2.4, 1.8, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    cardGroup.add(frameMesh);

    // Image face inside frame
    // Generate a sleek procedural mountain/sunset canvas texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 384;
    const ctx = texCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 384);
      grad.addColorStop(0, '#2563EB');
      grad.addColorStop(0.5, '#4F46E5');
      grad.addColorStop(1, '#9333EA');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 384);

      // Sun
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(380, 110, 48, 0, Math.PI * 2);
      ctx.fill();

      // Mountains
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(80, 384);
      ctx.lineTo(240, 180);
      ctx.lineTo(400, 384);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(220, 384);
      ctx.lineTo(350, 220);
      ctx.lineTo(480, 384);
      ctx.closePath();
      ctx.fill();

      // Sparkles
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('PicShrink 85% Saved', 40, 60);
    }

    const faceTexture = new THREE.CanvasTexture(texCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const faceGeo = new THREE.PlaneGeometry(2.24, 1.64);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTexture,
      roughness: 0.35,
      metalness: 0.05,
    });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);
    faceMesh.position.z = 0.045;
    cardGroup.add(faceMesh);

    // Floating Accent Diamond / Compression Gem
    const gemGeo = new THREE.OctahedronGeometry(0.42, 0);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.set(1.4, 0.9, 0.5);
    masterGroup.add(gemMesh);

    // Secondary Mini Card (Representing WebP/PNG)
    const miniCardGroup = new THREE.Group();
    const miniGeo = new THREE.BoxGeometry(1.2, 0.9, 0.06);
    const miniMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const miniMesh = new THREE.Mesh(miniGeo, miniMat);
    miniCardGroup.add(miniMesh);
    miniCardGroup.position.set(-1.3, -0.7, 0.4);
    miniCardGroup.rotation.z = -0.15;
    masterGroup.add(miniCardGroup);

    // Contact shadow grounding plane
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.15,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, -1.4, 0);
    shadowMesh.rotation.x = -Math.PI / 2;
    scene.add(shadowMesh);

    // 6. Interactive mouse damping
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.4;
      targetY = y * 0.3;
    };

    container.addEventListener('mousemove', onPointerMove);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Render Loop with silky smooth damping
    let frameId = 0;
    let clock = new THREE.Clock();

    const tick = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Exponential damping toward mouse target
      mouseX = THREE.MathUtils.damp(mouseX, targetX, 5, delta);
      mouseY = THREE.MathUtils.damp(mouseY, targetY, 5, delta);

      // Subtle floating motions
      cardGroup.rotation.y = mouseX + Math.sin(time * 1.2) * 0.08;
      cardGroup.rotation.x = -mouseY + Math.cos(time * 0.9) * 0.06;
      cardGroup.position.y = Math.sin(time * 1.5) * 0.08;

      gemMesh.rotation.x += delta * 0.8;
      gemMesh.rotation.y += delta * 1.2;
      gemMesh.position.y = 0.9 + Math.cos(time * 2.0) * 0.12;

      miniCardGroup.rotation.y = mouseX * 0.7 + Math.cos(time) * 0.1;
      miniCardGroup.position.y = -0.7 + Math.sin(time * 1.3) * 0.06;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    // 8. Clean disposal on unmount
    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('mousemove', onPointerMove);
      resizeObserver.disconnect();
      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      faceTexture.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      faceGeo.dispose();
      faceMat.dispose();
      gemGeo.dispose();
      gemMat.dispose();
      miniGeo.dispose();
      miniMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-[320px] sm:h-[380px] flex items-center justify-center pointer-events-auto"
      title="Interactive 3D Preview (Move your mouse)"
    />
  );
}
