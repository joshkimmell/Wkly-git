import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'rect' | 'star';
  life: number;
}

const COLORS = [
  '#7c3aed', '#a78bfa', '#f59e0b', '#10b981', '#3b82f6',
  '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#e11d48',
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createBurst(_canvasEl: HTMLCanvasElement, x: number, y: number): Particle[] {
  const count = 40;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(3, 12);
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomBetween(2, 6),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: randomBetween(4, 10),
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: randomBetween(-0.2, 0.2),
      shape: (['circle', 'rect', 'star'] as const)[Math.floor(Math.random() * 3)],
      life: 1,
    };
  });
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](x + r * Math.cos(angle), y + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

const FocusFireworks: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const burstCountRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const scheduleBurst = () => {
      if (burstCountRef.current >= 8) return;
      burstCountRef.current += 1;
      const bx = randomBetween(canvas.width * 0.1, canvas.width * 0.9);
      const by = randomBetween(canvas.height * 0.1, canvas.height * 0.6);
      particlesRef.current.push(...createBurst(canvas, bx, by));
      if (burstCountRef.current < 8) {
        setTimeout(scheduleBurst, randomBetween(300, 700));
      }
    };
    scheduleBurst();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.01);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.99;
        p.alpha -= 0.012;
        p.life -= 0.012;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          drawStar(ctx, 0, 0, p.size / 2);
        }
        ctx.restore();
      }

      if (particlesRef.current.length > 0 || burstCountRef.current < 8) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(onDone, 500);
      }
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[10001] pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-center animate-bounce-in">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">Task Complete!</h2>
          <p className="text-lg text-violet-200 mt-2 drop-shadow">Great work — you nailed it!</p>
        </div>
      </div>
    </div>
  );
};

export default FocusFireworks;
