
  // import { useEffect, useRef } from 'react';

  // function createParticles(count = 950) {
  //   const particles = [];
  //   const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  //   for (let i = 0; i < count; i++) {
  //     const y = 1 - (i / (count - 1)) * 2;
  //     const radius = Math.sqrt(1 - y * y);
  //     const theta = goldenAngle * i;

  //     particles.push({
  //       x: Math.cos(theta) * radius,
  //       y,
  //       z: Math.sin(theta) * radius,
  //     });
  //   }

  //   return particles;
  // }

  // export function OrbitField() {
  //   const canvasRef = useRef(null);

  //   useEffect(() => {
  //     const canvas = canvasRef.current;
  //     const ctx = canvas?.getContext('2d');

  //     if (!canvas || !ctx) return;

  //     const particles = createParticles();
  //     const reducedMotion = window.matchMedia(
  //       '(prefers-reduced-motion: reduce)'
  //     ).matches;

  //     let width = 0;
  //     let height = 0;
  //     let angle = 0;
  //     let hover = 0;
  //     let animationFrame;

  //     const pointer = {
  //       x: -1000,
  //       y: -1000,
  //       active: false,
  //     };

  //     const resize = () => {
  //       const rect = canvas.getBoundingClientRect();
  //       const dpr = Math.min(window.devicePixelRatio || 1, 2);

  //       width = rect.width;
  //       height = rect.height;

  //       canvas.width = Math.max(1, Math.round(width * dpr));
  //       canvas.height = Math.max(1, Math.round(height * dpr));

  //       ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  //     };

  //     const observer = new ResizeObserver(resize);
  //     observer.observe(canvas);
  //     resize();

  //     const handlePointerMove = (event) => {
  //       const rect = canvas.getBoundingClientRect();

  //       pointer.x = event.clientX - rect.left;
  //       pointer.y = event.clientY - rect.top;

  //       pointer.active =
  //         event.clientX >= rect.left &&
  //         event.clientX <= rect.right &&
  //         event.clientY >= rect.top &&
  //         event.clientY <= rect.bottom;
  //     };

  //     const handlePointerLeave = () => {
  //       pointer.active = false;
  //     };

  //     window.addEventListener('pointermove', handlePointerMove);
  //     window.addEventListener('blur', handlePointerLeave);

  //     const rotatePoint = (point, rotation, tilt) => {
  //       const cosA = Math.cos(rotation);
  //       const sinA = Math.sin(rotation);
  //       const cosT = Math.cos(tilt);
  //       const sinT = Math.sin(tilt);

  //       const x = point.x * cosA - point.z * sinA;
  //       const z = point.x * sinA + point.z * cosA;

  //       const y = point.y * cosT - z * sinT;
  //       const depth = point.y * sinT + z * cosT;

  //       const perspective = 3.2 / (3.8 + depth);

  //       return {
  //         x: x * perspective,
  //         y: y * perspective,
  //         z: depth,
  //         perspective,
  //       };
  //     };

  //     const drawOrbit = (cx, cy, radius, rotation, tilt, opacity) => {
  //       ctx.beginPath();

  //       const segments = 180;

  //       for (let i = 0; i <= segments; i++) {
  //         const t = (i / segments) * Math.PI * 2;

  //         const point = rotatePoint(
  //           {
  //             x: Math.cos(t),
  //             y: Math.sin(t),
  //             z: 0,
  //           },
  //           rotation,
  //           tilt
  //         );

  //         const x = cx + point.x * radius;
  //         const y = cy + point.y * radius;

  //         if (i === 0) {
  //           ctx.moveTo(x, y);
  //         } else {
  //           ctx.lineTo(x, y);
  //         }
  //       }

  //       ctx.closePath();

  //       ctx.strokeStyle = `rgba(139, 116, 255, ${opacity})`;
  //       ctx.lineWidth = 0.8;
  //       ctx.stroke();
  //     };

  //     const draw = () => {
  //       ctx.clearRect(0, 0, width, height);

  //       if (!width || !height) {
  //         animationFrame = requestAnimationFrame(draw);
  //         return;
  //       }

  //       hover += ((pointer.active ? 1 : 0) - hover) * 0.045;

  //       if (!reducedMotion) {
  //         angle += 0.002;
  //       }

  //       // Compact position on the right side of the hero.
  //       const cx = width * 0.76;
  //       const cy = height * 0.49;

  //       // Keep the graphic relatively small.
  //       const radius = Math.min(width, height) * 0.165;

  //       const tilt = 0.65;

  //       // Soft localized ambient glow.
  //       if (hover > 0.01) {
  //         const glow = ctx.createRadialGradient(
  //           cx, cy, radius * 0.1,
  //           cx, cy, radius * 1.65
  //         );

  //         glow.addColorStop(
  //           0,
  //           `rgba(139, 92, 246, ${0.16 * hover})`
  //         );

  //         glow.addColorStop(
  //           0.55,
  //           `rgba(99, 102, 241, ${0.08 * hover})`
  //         );

  //         glow.addColorStop(1, 'rgba(99, 102, 241, 0)');

  //         ctx.fillStyle = glow;
  //         ctx.fillRect(
  //           cx - radius * 1.7,
  //           cy - radius * 1.7,
  //           radius * 3.4,
  //           radius * 3.4
  //         );
  //       }

  //       // Three delicate orbital paths.
  //       drawOrbit(
  //         cx, cy, radius * 1.28,
  //         angle * 0.65, 0.45,
  //         0.15 + hover * 0.28
  //       );

  //       drawOrbit(
  //         cx, cy, radius * 1.38,
  //         -angle * 0.8, 1.05,
  //         0.12 + hover * 0.25
  //       );

  //       drawOrbit(
  //         cx, cy, radius * 1.18,
  //         angle * 0.5, 1.45,
  //         0.10 + hover * 0.22
  //       );

  //       // Transform sphere particles.
  //       const projected = particles.map((particle) => {
  //         const point = rotatePoint(particle, angle, tilt);

  //         return {
  //           x: cx + point.x * radius,
  //           y: cy + point.y * radius,
  //           z: point.z,
  //         };
  //       });

  //       projected.sort((a, b) => a.z - b.z);

  //       // Draw particles.
  //       for (const point of projected) {
  //         const depth = (point.z + 1) / 2;

  //         const dx = point.x - pointer.x;
  //         const dy = point.y - pointer.y;
  //         const distance = Math.sqrt(dx * dx + dy * dy);

  //         const influence = pointer.active
  //           ? Math.max(0, 1 - distance / (radius * 1.15)) * hover
  //           : 0;

  //         const brightness = Math.min(
  //           1,
  //           0.28 + depth * 0.65 + influence * 0.65
  //         );

  //         const size = 0.7 + depth * 1.1 + influence * 1.7;

  //         const alpha = Math.min(
  //           1,
  //           0.22 + depth * 0.65 + influence * 0.35
  //         );

  //         ctx.fillStyle = influence > 0.1
  //           ? `rgba(237, 233, 254, ${alpha})`
  //           : `rgba(139, 130, 255, ${alpha * brightness})`;

  //         ctx.shadowColor = influence > 0.1
  //           ? '#c4b5fd'
  //           : '#818cf8';

  //         ctx.shadowBlur = influence > 0.1
  //           ? 5 + influence * 15
  //           : depth > 0.7 ? 3 : 0;

  //         ctx.beginPath();
  //         ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
  //         ctx.fill();
  //       }

  //       ctx.shadowBlur = 0;

  //       // Small glowing orbital accent.
  //       const accentAngle = angle * 1.8;

  //       const accentX = cx + Math.cos(accentAngle) * radius * 1.28;
  //       const accentY = cy + Math.sin(accentAngle) * radius * 0.48;

  //       ctx.beginPath();
  //       ctx.arc(accentX, accentY, 2.2 + hover, 0, Math.PI * 2);
  //       ctx.fillStyle = '#c4b5fd';
  //       ctx.shadowColor = '#a78bfa';
  //       ctx.shadowBlur = 12 + hover * 15;
  //       ctx.fill();

  //       ctx.shadowBlur = 0;

  //       animationFrame = requestAnimationFrame(draw);
  //     };

  //     animationFrame = requestAnimationFrame(draw);

  //     return () => {
  //       cancelAnimationFrame(animationFrame);
  //       observer.disconnect();

  //       window.removeEventListener('pointermove', handlePointerMove);
  //       window.removeEventListener('blur', handlePointerLeave);
  //     };
  //   }, []);

  //   return (
  //     <canvas
  //       ref={canvasRef}
  //       className="orbit-field"
  //       aria-hidden="true"
  //       style={{
  //         position: 'absolute',
  //         inset: 0,
  //         width: '100%',
  //         height: '100%',
  //         display: 'block',
  //         pointerEvents: 'none',
  //         zIndex: 0,
  //       }}
  //     />
  //   );
  // }
