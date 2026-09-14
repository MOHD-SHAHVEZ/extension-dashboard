import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as THREE from "three";
import LoginForm from "./LoginForm";
import SignupForm from "./Signup";

export default function AuthPage() {
  const canvasRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which side of the card to show
  const isSignup = location.pathname === "/signup";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 8.5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting - Soft and elegant
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x6366f1, 2.8);
    mainLight.position.set(4, 5, 4);
    scene.add(mainLight);

    const accentLight = new THREE.DirectionalLight(0x06b6d4, 2.2);
    accentLight.position.set(-5, -4, 3);
    scene.add(accentLight);

    // Master Group
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Inner Luminous Core (Soft Sphere)
    const coreGeo = new THREE.SphereGeometry(1.6, 64, 64);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.35,
      metalness: 0.6,
      emissive: 0x312e81,
      emissiveIntensity: 0.35
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    masterGroup.add(coreMesh);

    // Outer Translucent Glow Shell
    const shellGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    masterGroup.add(shellMesh);

    // Refined Orbital Rings (Elegant Thin Toruses)
    const ringGroup = new THREE.Group();
    masterGroup.add(ringGroup);

    const ring1Geo = new THREE.TorusGeometry(2.6, 0.015, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.55 });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3.2;
    ringGroup.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(3.1, 0.015, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45 });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 5;
    ringGroup.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(3.6, 0.012, 16, 120);
    const ring3Mat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.3 });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.z = Math.PI / 2.5;
    ring3.rotation.y = -Math.PI / 6;
    ringGroup.add(ring3);

    // Soft Floating Copilot Particle Cloud
    const particleCount = 130;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 12;
      posArray[i + 1] = (Math.random() - 0.5) * 12;
      posArray[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.045,
      transparent: true,
      opacity: 0.65
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Smooth Gentle Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - windowHalfX) * 0.0004;
      mouseY = (e.clientY - windowHalfY) * 0.0004;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Window Resize Handler
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const width = canvas.parentElement.clientWidth;
      const height = canvas.parentElement.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Render Loop
    let clock = new THREE.Clock();
    let animationFrameId;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      masterGroup.rotation.y = t * 0.12 + targetX * 1.5;
      masterGroup.rotation.x = Math.sin(t * 0.15) * 0.12 + targetY * 1.5;

      ring1.rotation.z = t * 0.09;
      ring2.rotation.z = -t * 0.11;
      ring3.rotation.x = t * 0.07;

      // Subtle breathing scale
      const breath = 1 + Math.sin(t * 0.8) * 0.025;
      coreMesh.scale.set(breath, breath, breath);

      particles.rotation.y = t * 0.02;

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      // Clean up three.js resources to prevent memory leaks
      scene.clear();
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f6fb] font-sans text-slate-900 antialiased flex flex-col items-center justify-center p-3 sm:p-8 relative">
      
      {/* CENTERED WHITE CARD */}
      <div className="w-full max-w-[1050px] bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-0 md:min-h-[640px] relative z-10 overflow-x-hidden overflow-y-auto md:overflow-hidden flex flex-col md:block">
        
        {/* LOGIN FORM (LEFT HALF) */}
        <div className={`no-scrollbar w-full md:absolute md:top-0 md:left-0 md:w-1/2 md:h-full p-4 sm:p-10 flex flex-col justify-center overflow-y-auto overflow-x-hidden transition-opacity duration-700 ${!isSignup ? 'opacity-100 z-10 pointer-events-auto' : 'md:opacity-0 md:z-0 md:pointer-events-none hidden md:flex'}`}>
          <div className="w-full max-w-[420px] mx-auto my-auto py-4">
            <LoginForm onNavigate={() => navigate('/signup')} />
          </div>
        </div>

        {/* SIGNUP FORM (RIGHT HALF) */}
        <div className={`no-scrollbar w-full md:absolute md:top-0 md:right-0 md:w-1/2 md:h-full p-4 sm:p-10 flex flex-col justify-center overflow-y-auto overflow-x-hidden transition-opacity duration-700 ${isSignup ? 'opacity-100 z-10 pointer-events-auto' : 'md:opacity-0 md:z-0 md:pointer-events-none hidden md:flex'}`}>
          <div className="w-full max-w-[420px] mx-auto my-auto py-4">
            <SignupForm isEmbedded={true} onNavigate={() => navigate('/login')} />
          </div>
        </div>

        {/* OVERLAY (DARK PRESENTATION PANEL) */}
        <div 
          className={`hidden md:block absolute top-0 left-0 w-1/2 h-full p-3 z-20 transition-transform duration-1000 ease-in-out ${!isSignup ? 'translate-x-full' : 'translate-x-0'}`}
        >
          <div className="w-full h-full bg-[#0b1121] rounded-[1.5rem] relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 text-white shadow-2xl">
            
            {/* Interactive ThreeJS Canvas - INSIDE THE PANEL */}
            <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full z-0 pointer-events-auto cursor-grab active:cursor-grabbing" 
            />
            
            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-0 w-[250px] h-[250px] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b1121]/40 via-transparent to-[#0b1121]/90 z-0 pointer-events-none"></div>

            {/* Content Top */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-cyan-300 text-[18px]">backpack</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold tracking-tight text-white leading-tight">eBag AI</span>
                  <span className="text-[10px] font-medium text-slate-300 truncate">Notes, plan &amp; AI summaries</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] tracking-wider font-semibold backdrop-blur-md">
                PRO FEATURES
              </div>
            </div>

            {/* Content Middle List */}
            <div className="relative z-10 mt-6 flex flex-col gap-3">
               <div className="flex items-center gap-3 text-slate-300">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                 <span className="font-medium text-sm">AI summaries for lessons &amp; links</span>
               </div>
               <div className="flex items-center gap-3 text-slate-300">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                 <span className="font-medium text-sm">Daily plan and tasks</span>
               </div>
               <div className="flex items-center gap-3 text-slate-300">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                 <span className="font-medium text-sm">Notebooks in one desk</span>
               </div>
            </div>

            <div className="relative z-10 flex-1" />

            {/* Content Bottom */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col items-center justify-center mt-2">
              <p className="text-slate-300 text-sm mb-3 font-medium">
                {isSignup ? "Already have an account?" : "Don't have an account?"}
              </p>
              <button 
                onClick={() => navigate(isSignup ? '/login' : '/signup')}
                className="relative overflow-hidden group w-full py-3 rounded-xl border-2 border-indigo-500/50 bg-transparent text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)]"
              >
                {/* Hover Color Fill Effect */}
                <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
                
                <div className="relative z-10 flex items-center justify-center gap-2">
                  <span>{isSignup ? "Log In to Account" : "Create an Account"}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </div>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
