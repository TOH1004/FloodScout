import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCw, Play, Pause, Compass, Maximize2 } from 'lucide-react';

interface ModelViewer3DProps {
  modelUrl?: string;
  className?: string;
  autoRotateSpeed?: number;
  showControls?: boolean;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelUrl = '/model.glb',
  className = 'w-full h-full min-h-[380px]',
  autoRotateSpeed = 1.2,
  showControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(true);

  // References to three objects for interaction
  const controlsRef = useRef<OrbitControls | null>(null);
  const initialCamPos = useRef(new THREE.Vector3(2.6, 1.8, 3.2));
  const modelGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let isDisposed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 380;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.copy(initialCamPos.current);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = autoRotateSpeed;
    controls.minDistance = 1.2;
    controls.maxDistance = 7.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.15; // Don't flip under
    controlsRef.current = controls;

    // 5. Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.6);
    scene.add(hemiLight);

    // Key light (bright white)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);

    // Front-left fill light (subtle cool)
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.8);
    fillLight.position.set(-6, 5, 4);
    scene.add(fillLight);

    // Rear cyan rim light (accentuates contours)
    const rimLight = new THREE.DirectionalLight(0x22d3ee, 2.5);
    rimLight.position.set(0, 4, -8);
    scene.add(rimLight);

    // Water bounce from below
    const bounceLight = new THREE.DirectionalLight(0x0284c7, 1.2);
    bounceLight.position.set(0, -6, 2);
    scene.add(bounceLight);

    // 6. Subtle Water Plane Grid
    const gridHelper = new THREE.GridHelper(8, 16, 0x22d3ee, 0x1e3a5f);
    gridHelper.position.y = -1.1;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Circular water target ring
    const ringGeo = new THREE.RingGeometry(1.6, 1.64, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -1.09;
    scene.add(ringMesh);

    // Outer faint ring
    const ringGeo2 = new THREE.RingGeometry(2.3, 2.33, 64);
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat);
    ringMesh2.rotation.x = -Math.PI / 2;
    ringMesh2.position.y = -1.09;
    scene.add(ringMesh2);

    // 7. Load GLB Model
    const loader = new GLTFLoader();
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    loader.load(
      modelUrl,
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;

        // 1. Scale model to standard bounding dimension of ~2.4 units
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
        const targetScale = 2.4 / (maxDim || 1);
        model.scale.set(targetScale, targetScale, targetScale);
        model.updateMatrixWorld(true);

        // 2. Recompute box after scaling and center precisely at origin
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        model.position.x = -scaledCenter.x;
        model.position.y = -scaledCenter.y;
        model.position.z = -scaledCenter.z;

        // 3. Inspect and apply materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
              // If material base color is nearly black, restore intended color from extras._color (0xdfe3ea)
              if (mat.color.r < 0.08 && mat.color.g < 0.08 && mat.color.b < 0.08) {
                mat.color.setHex(0xdfe3ea);
              }
              mat.roughness = 0.35;
              mat.metalness = 0.35;
              mesh.material = mat;
            }
          }
        });

        modelGroup.add(model);

        // Position camera to look at center
        camera.position.set(2.6, 1.8, 3.2);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadProgress(Math.round((xhr.loaded / xhr.total) * 100));
        } else {
          setLoadProgress((prev) => Math.min(prev + 15, 90));
        }
      },
      (err) => {
        console.error('Error loading 3D model:', err);
        setError('Failed to load 3D model. Falling back.');
        setLoading(false);
      }
    );

    // 8. Animation loop with gentle water bobbing
    const clock = new THREE.Clock();

    const animate = () => {
      if (isDisposed) return;
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Gentle floating buoyancy effect (subtle roll & pitch)
      if (modelGroupRef.current) {
        modelGroupRef.current.position.y = 0.08 + Math.sin(elapsedTime * 1.6) * 0.04;
        modelGroupRef.current.rotation.z = Math.sin(elapsedTime * 1.2) * 0.02;
        modelGroupRef.current.rotation.x = Math.cos(elapsedTime * 1.4) * 0.015;
      }

      // Rotate subtle water ripple
      ringMesh.rotation.z = elapsedTime * 0.1;
      ringMesh2.rotation.z = -elapsedTime * 0.07;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize listener
    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl, autoRotateSpeed]);

  const toggleRotation = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isRotating;
      setIsRotating(!isRotating);
    }
  };

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.autoRotate = isRotating;
    }
  };

  return (
    <div className={`relative select-none group flex items-center justify-center ${className}`}>
      {/* Irregular Shape Backdrop in Riviera Blue behind 3D Model */}


      {/* 3D Canvas mount point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 rounded-3xl bg-[#183451]/85 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-12 h-12 rounded-2xl bg-[#22d3ee]/10 border border-[#22d3ee]/40 flex items-center justify-center animate-spin">
            <RotateCw size={22} className="text-[#22d3ee]" />
          </div>
          <div className="text-center font-mono">
            <span className="text-white text-xs font-bold tracking-wider uppercase block">Loading 3D Vessel</span>
            <span className="text-cyan-400 text-[11px] mt-0.5 block">{loadProgress}% loaded</span>
          </div>
          <div className="w-40 h-1.5 bg-[#14202d] rounded-full overflow-hidden mt-1 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-300"
              style={{ width: `${Math.max(8, loadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Top Left Badge: 3D Inspection Tag */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <div className="bg-[#183451]/85 backdrop-blur-md border border-cyan-500/30 rounded-full px-3 py-1 text-[11px] font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse" />
          <span className="font-bold tracking-wider">3D INTERACTIVE USV-01</span>
        </div>
      </div>

      {/* Top Right: Status Badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <div className="bg-[#183451]/85 backdrop-blur-md border border-emerald-500/30 rounded-full px-3 py-1 text-[10px] font-mono text-emerald-400 font-bold shadow-lg">
          ● OPERATIONAL
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      {showControls && !loading && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          <div className="bg-[#183451]/85 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-200 shadow-xl hidden sm:flex items-center gap-2">
            <Compass size={13} className="text-cyan-400" />
            <span>Drag to rotate · Scroll to zoom</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#183451]/85 backdrop-blur-md border border-white/15 rounded-xl p-1 shadow-xl ml-auto">
            <button
              onClick={toggleRotation}
              className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                isRotating
                  ? 'bg-[#A9501C] text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title={isRotating ? 'Pause rotation' : 'Start rotation'}
            >
              {isRotating ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Reset camera view"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelViewer3D;
