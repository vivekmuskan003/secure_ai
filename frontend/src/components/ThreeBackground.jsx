/**
 * components/ThreeBackground.jsx — Three.js Animated Neural Network Background
 *
 * Creates an immersive animated background with:
 *  - Floating nodes (particles)
 *  - Connecting lines between nearby nodes (neural network effect)
 *  - Smooth mouse-reactive camera movement
 *  - Teal/purple color scheme matching the brand
 *
 * Performance optimized: uses requestAnimationFrame, proper cleanup on unmount.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Cleanup on component unmount ─────────────────────────
    let frameId;
    let renderer;
    let handleMouseMove, handleResize;

    try {
      // ── Scene setup ─────────────────────────────────────────
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        mount.clientWidth / mount.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 60;

      // Suppress noisy native WebGL errors from ThreeJS if hardware acceleration is disabled
      const originalConsoleError = console.error;
      console.error = () => {};

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } finally {
        // Always restore console.error immediately after constructor
        console.error = originalConsoleError;
      }

      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0); // transparent background
      mount.appendChild(renderer.domElement);

      // ── Node particles ───────────────────────────────────────
      const NODE_COUNT = 120;
      const SPREAD = 80;

      const positions = [];
      const nodePoints = [];
      const nodeGroup = new THREE.Group();
      scene.add(nodeGroup);

      for (let i = 0; i < NODE_COUNT; i++) {
        const x = (Math.random() - 0.5) * SPREAD;
        const y = (Math.random() - 0.5) * SPREAD;
        const z = (Math.random() - 0.5) * SPREAD;

        positions.push(new THREE.Vector3(x, y, z));

        const isTeal = Math.random() > 0.4;
        const color = isTeal ? 0x14b8a6 : 0x8b5cf6;
        const size = 0.15 + Math.random() * 0.25;

        const geo = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);

        mesh.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        );

        nodeGroup.add(mesh);
        nodePoints.push(mesh);
      }

      // ── Connecting lines ─────────────────────────────────────
      const MAX_CONNECTION_DIST = 18;
      const lineGroup = new THREE.Group();
      scene.add(lineGroup);

      const lines = [];

      const updateLines = () => {
        lines.forEach((line) => lineGroup.remove(line));
        lines.length = 0;

        for (let i = 0; i < nodePoints.length; i++) {
          for (let j = i + 1; j < nodePoints.length; j++) {
            const dist = nodePoints[i].position.distanceTo(nodePoints[j].position);
            if (dist < MAX_CONNECTION_DIST) {
              const opacity = 1 - dist / MAX_CONNECTION_DIST;
              const mat = new THREE.LineBasicMaterial({
                color: 0x14b8a6,
                transparent: true,
                opacity: opacity * 0.25,
              });
              const geometry = new THREE.BufferGeometry().setFromPoints([
                nodePoints[i].position.clone(),
                nodePoints[j].position.clone(),
              ]);
              const line = new THREE.Line(geometry, mat);
              lineGroup.add(line);
              lines.push(line);
            }
          }
        }
      };

      // ── Mouse interaction ────────────────────────────────────
      const mouse = { x: 0, y: 0 };
      handleMouseMove = (e) => {
        mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener('mousemove', handleMouseMove);

      // ── Animation loop ───────────────────────────────────────
      let frameCount = 0;

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        frameCount++;

        nodePoints.forEach((node) => {
          node.position.add(node.userData.velocity);
          ['x', 'y', 'z'].forEach((axis) => {
            if (Math.abs(node.position[axis]) > SPREAD / 2) {
              node.userData.velocity[axis] *= -1;
            }
          });
        });

        if (frameCount % 3 === 0) {
          updateLines();
        }

        camera.position.x += (mouse.x * 5 - camera.position.x) * 0.02;
        camera.position.y += (mouse.y * 3 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        nodeGroup.rotation.y += 0.0005;
        lineGroup.rotation.y += 0.0005;

        renderer.render(scene, camera);
      };
      animate();

      // ── Resize handler ───────────────────────────────────────
      handleResize = () => {
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener('resize', handleResize);

    } catch (err) {
      // Fallback is automatically handled by the CSS gradient background class.
      // Deliberately ignoring the WebGL context error to keep console clean.
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (handleMouseMove) window.removeEventListener('mousemove', handleMouseMove);
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (renderer && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(135deg, #020818 0%, #060d20 50%, #0a1628 100%)' }}
    />
  );
}
