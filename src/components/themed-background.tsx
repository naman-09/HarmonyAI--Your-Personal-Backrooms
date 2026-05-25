'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeEngine } from '@/lib/theme/store';
import type { ParticleType } from '@/lib/theme/types';

/**
 * Sits at the back of every page (z-index: -10) and renders a
 * gradient that smoothly cross-fades between presets as time / weather /
 * season change. Particle effects layered on top only in 'dynamic' motion.
 */
export function ThemedBackground() {
  const { preset, effectiveMotion } = useThemeEngine();

  // Fade transition duration — reduced motion users get an instant swap
  const duration = effectiveMotion === 'reduced' ? 0.001 : 1.2;

  return (
    <div className="themed-bg-host" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.div
          key={preset.id}
          className="themed-bg-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
          style={{
            background: `linear-gradient(135deg, ${preset.palette.gradient[0]} 0%, ${preset.palette.gradient[1]} 50%, ${preset.palette.gradient[2]} 100%)`,
          }}
        >
          {preset.palette.overlay && (
            <div
              className="themed-bg-overlay"
              style={{ background: preset.palette.overlay }}
            />
          )}
          {effectiveMotion === 'dynamic' && preset.particles !== 'none' && (
            <ParticleLayer type={preset.particles} density={preset.particleDensity} />
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`
        .themed-bg-host {
          position: fixed;
          inset: 0;
          z-index: -10;
          pointer-events: none;
          overflow: hidden;
        }
        .themed-bg-layer {
          position: absolute;
          inset: 0;
          will-change: opacity;
        }
        .themed-bg-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

// ─── Particle layer — Canvas, GPU-accelerated, respects motion ──
interface ParticleProps {
  type:    ParticleType;
  density: number;
}

function ParticleLayer({ type, density }: ParticleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cap DPR so we don't melt low-end GPUs on retina displays.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width  = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width  = w + 'px';
      canvas!.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Particle pool ────────────────────────────────────────
    interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; phase: number }
    const count = Math.floor(140 * Math.max(0, Math.min(density, 1)));
    const particles: P[] = [];
    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    function seed(p: P, init = false) {
      switch (type) {
        case 'rain': {
          p.x = Math.random() * w();
          p.y = init ? Math.random() * h() : -10;
          p.vx = -0.6;
          p.vy = 9 + Math.random() * 5;
          p.r  = 1.1 + Math.random() * 0.6;
          p.a  = 0.25 + Math.random() * 0.35;
          break;
        }
        case 'snow': {
          p.x = Math.random() * w();
          p.y = init ? Math.random() * h() : -10;
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = 0.6 + Math.random() * 1.3;
          p.r  = 1 + Math.random() * 2.5;
          p.a  = 0.4 + Math.random() * 0.45;
          break;
        }
        case 'fireflies': {
          p.x = Math.random() * w();
          p.y = Math.random() * h();
          p.vx = (Math.random() - 0.5) * 0.25;
          p.vy = (Math.random() - 0.5) * 0.25;
          p.r  = 1.2 + Math.random() * 1.6;
          p.a  = 0.3 + Math.random() * 0.5;
          p.phase = Math.random() * Math.PI * 2;
          break;
        }
        case 'dust': {
          p.x = Math.random() * w();
          p.y = Math.random() * h();
          p.vx = 0.4 + Math.random() * 0.8;
          p.vy = (Math.random() - 0.5) * 0.3;
          p.r  = 0.8 + Math.random() * 1.5;
          p.a  = 0.15 + Math.random() * 0.20;
          break;
        }
        default: break;
      }
      p.phase ??= 0;
    }
    for (let i = 0; i < count; i++) {
      const p: P = { x: 0, y: 0, vx: 0, vy: 0, r: 1, a: 1, phase: 0 };
      seed(p, true);
      particles.push(p);
    }

    // Colors per type (kept neutral so the gradient does the heavy lifting)
    const color = {
      rain:      'rgba(200, 220, 255, ',
      snow:      'rgba(245, 250, 255, ',
      fireflies: 'rgba(255, 220, 140, ',
      dust:      'rgba(220, 180, 130, ',
      none:      'rgba(255, 255, 255, ',
    }[type];

    let t = 0;
    function frame() {
      const W = w();
      const H = h();
      ctx!.clearRect(0, 0, W, H);
      t += 0.016;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Recycle off-screen
        if (type === 'rain' || type === 'snow') {
          if (p.y > H + 10) seed(p, false);
          if (p.x < -20)    p.x = W + 10;
        } else if (type === 'dust') {
          if (p.x > W + 20) p.x = -20;
          if (p.y < -20)    p.y = H + 20;
          if (p.y > H + 20) p.y = -20;
        } else if (type === 'fireflies') {
          if (p.x < 0 || p.x > W) p.vx = -p.vx;
          if (p.y < 0 || p.y > H) p.vy = -p.vy;
        }

        // Draw
        let alpha = p.a;
        if (type === 'fireflies') {
          alpha = p.a * (0.5 + 0.5 * Math.sin(t * 2 + p.phase));
        }
        ctx!.fillStyle = color + alpha + ')';
        if (type === 'rain') {
          ctx!.fillRect(p.x, p.y, 1.1, p.r * 6);
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [type, density]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: type === 'fireflies' ? 0.85 : 1,
      }}
    />
  );
}
