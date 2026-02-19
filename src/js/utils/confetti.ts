interface ConfettiOptions {
  particleCount?: number;
  burstCount?: number;
  durationMs?: number;
  originX?: number;
  originY?: number;
  spread?: number;
  burstVelocityMin?: number;
  burstVelocityMax?: number;
  enableTopRain?: boolean;
  popScale?: number;
}

type ParticleShape = 'rect' | 'circle' | 'streamer';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  rotation: number;
  rotationSpeed: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleDistance: number;
  width: number;
  height: number;
  color: string;
  shape: ParticleShape;
  opacity: number;
  ageMs: number;
  lifetimeMs: number;
}

const CONFETTI_COLORS = [
  '#3b63a4',
  '#5f84bf',
  '#a7ceda',
  '#4caf50',
  '#f57c00',
  '#ffd54f',
  '#ef5350',
  '#ffffff'
] as const;

const TWO_PI = Math.PI * 2;
const BURST_INTERVAL_MS = 120;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandomColor(): string {
  const index = Math.floor(Math.random() * CONFETTI_COLORS.length);
  return CONFETTI_COLORS[index] ?? CONFETTI_COLORS[0];
}

function createOverlayCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  return canvas;
}

function createPopFlash(x: number, y: number, scale = 1): void {
  const flash = document.createElement('div');
  flash.className = 'confetti-pop-flash';
  flash.style.left = `${x}px`;
  flash.style.top = `${y}px`;
  flash.style.transform = `translate(-50%, -50%) scale(${Math.max(0.6, scale)})`;

  const core = document.createElement('span');
  core.className = 'confetti-pop-core';

  const innerRing = document.createElement('span');
  innerRing.className = 'confetti-pop-ring confetti-pop-ring--inner';

  const outerRing = document.createElement('span');
  outerRing.className = 'confetti-pop-ring confetti-pop-ring--outer';

  flash.append(core, innerRing, outerRing);
  document.body.appendChild(flash);

  window.setTimeout(() => {
    flash.remove();
  }, 700);
}

function createBurstParticle(
  originX: number,
  originY: number,
  spreadRadians: number,
  velocityMin: number,
  velocityMax: number
): ConfettiParticle {
  const shapeRoll = Math.random();
  const shape: ParticleShape = shapeRoll > 0.7 ? 'streamer' : shapeRoll > 0.35 ? 'rect' : 'circle';
  const baseSize = randomBetween(6, 13);
  const width = shape === 'streamer' ? baseSize * randomBetween(0.35, 0.55) : baseSize;
  const height = shape === 'streamer' ? baseSize * randomBetween(2.2, 3.2) : baseSize * randomBetween(0.65, 1.2);
  const direction = -Math.PI / 2 + randomBetween(-spreadRadians / 2, spreadRadians / 2);
  const speed = randomBetween(velocityMin, velocityMax);

  return {
    x: originX,
    y: originY,
    vx: Math.cos(direction) * speed,
    vy: Math.sin(direction) * speed,
    gravity: randomBetween(980, 1450),
    drag: randomBetween(0.982, 0.994),
    rotation: randomBetween(0, TWO_PI),
    rotationSpeed: randomBetween(-10, 10),
    wobblePhase: randomBetween(0, TWO_PI),
    wobbleSpeed: randomBetween(7, 15),
    wobbleDistance: randomBetween(3, 8),
    width,
    height,
    color: pickRandomColor(),
    shape,
    opacity: 1,
    ageMs: 0,
    lifetimeMs: randomBetween(1600, 2800)
  };
}

function createRainParticle(viewportWidth: number): ConfettiParticle {
  const shape: ParticleShape = Math.random() > 0.8 ? 'streamer' : Math.random() > 0.45 ? 'rect' : 'circle';
  const baseSize = randomBetween(5, 11);
  const width = shape === 'streamer' ? baseSize * randomBetween(0.35, 0.5) : baseSize;
  const height = shape === 'streamer' ? baseSize * randomBetween(2.0, 3.0) : baseSize * randomBetween(0.65, 1.15);

  return {
    x: randomBetween(0, viewportWidth),
    y: randomBetween(-40, -12),
    vx: randomBetween(-75, 75),
    vy: randomBetween(120, 320),
    gravity: randomBetween(720, 1120),
    drag: randomBetween(0.986, 0.996),
    rotation: randomBetween(0, TWO_PI),
    rotationSpeed: randomBetween(-7, 7),
    wobblePhase: randomBetween(0, TWO_PI),
    wobbleSpeed: randomBetween(4, 9),
    wobbleDistance: randomBetween(2, 7),
    width,
    height,
    color: pickRandomColor(),
    shape,
    opacity: randomBetween(0.74, 1),
    ageMs: 0,
    lifetimeMs: randomBetween(1500, 2600)
  };
}

/**
 * Creates a confetti celebration effect with a realistic burst + falloff.
 */
export function createConfetti(options: ConfettiOptions = {}): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const reduceMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const originX = options.originX ?? viewportWidth * 0.5;
  const originY = options.originY ?? viewportHeight * 0.35;
  const burstCount = reduceMotion ? 1 : Math.max(1, options.burstCount ?? 3);
  const particleCount = reduceMotion ? 24 : Math.max(24, options.particleCount ?? 170);
  const particlesPerBurst = Math.max(8, Math.floor(particleCount / burstCount));
  const spreadRadians = Math.max(Math.PI / 8, Math.min(Math.PI * 1.8, options.spread ?? Math.PI * 1.2));
  const durationMs = Math.max(700, options.durationMs ?? (reduceMotion ? 1100 : 2300));
  const velocityMin = Math.max(180, options.burstVelocityMin ?? 360);
  const velocityMax = Math.max(velocityMin + 30, options.burstVelocityMax ?? 860);
  const enableTopRain = options.enableTopRain ?? !reduceMotion;

  createPopFlash(originX, originY, options.popScale ?? 1);

  const canvas = createOverlayCanvas();
  const context = canvas.getContext('2d');
  if (!context) {
    canvas.remove();
    return;
  }

  const particles: ConfettiParticle[] = [];
  const startTime = performance.now();
  const endTime = startTime + durationMs;
  let lastFrameTime = startTime;
  let animationFrameId: number | null = null;
  let isDestroyed = false;

  const resizeHandler = (): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  const addBurst = (): void => {
    for (let index = 0; index < particlesPerBurst; index++) {
      particles.push(createBurstParticle(originX, originY, spreadRadians, velocityMin, velocityMax));
    }
  };

  for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) {
    window.setTimeout(() => {
      if (!isDestroyed) {
        addBurst();
      }
    }, burstIndex * BURST_INTERVAL_MS);
  }

  const destroy = (): void => {
    if (isDestroyed) {
      return;
    }

    isDestroyed = true;
    window.removeEventListener('resize', resizeHandler);
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    canvas.remove();
  };

  window.addEventListener('resize', resizeHandler);

  const tick = (frameTime: number): void => {
    if (isDestroyed) {
      return;
    }

    const deltaSeconds = Math.min(0.04, Math.max(0.001, (frameTime - lastFrameTime) / 1000));
    lastFrameTime = frameTime;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (enableTopRain && frameTime < endTime && Math.random() > 0.4) {
      particles.push(createRainParticle(canvas.width));
    }

    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      if (!particle) {
        continue;
      }

      particle.ageMs += deltaSeconds * 1000;
      particle.opacity = Math.max(0, 1 - particle.ageMs / particle.lifetimeMs);
      particle.vx *= particle.drag;
      particle.vy += particle.gravity * deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.rotation += particle.rotationSpeed * deltaSeconds;
      particle.wobblePhase += particle.wobbleSpeed * deltaSeconds;

      const wobbleX = Math.sin(particle.wobblePhase) * particle.wobbleDistance;
      const flipScaleY = Math.max(0.2, Math.abs(Math.cos(particle.rotation * 1.35)));

      context.save();
      context.globalAlpha = particle.opacity;
      context.translate(particle.x + wobbleX, particle.y);
      context.rotate(particle.rotation);
      context.scale(1, flipScaleY);
      context.fillStyle = particle.color;

      if (particle.shape === 'circle') {
        context.beginPath();
        context.arc(0, 0, particle.width * 0.5, 0, TWO_PI);
        context.fill();
      } else {
        context.fillRect(
          -particle.width * 0.5,
          -particle.height * 0.5,
          particle.width,
          particle.height
        );
      }
      context.restore();

      const isOutsideViewport = particle.y > canvas.height + 80 ||
        particle.x < -100 ||
        particle.x > canvas.width + 100;

      if (particle.opacity <= 0 || isOutsideViewport) {
        particles.splice(index, 1);
      }
    }

    if (frameTime < endTime || particles.length > 0) {
      animationFrameId = requestAnimationFrame(tick);
      return;
    }

    destroy();
  };

  animationFrameId = requestAnimationFrame(tick);
}

/**
 * Creates a burst at a specific viewport position.
 */
export function createFirework(x: number, y: number): void {
  createConfetti({
    particleCount: 54,
    burstCount: 1,
    durationMs: 1100,
    originX: x,
    originY: y,
    spread: Math.PI * 1.7,
    burstVelocityMin: 290,
    burstVelocityMax: 760,
    enableTopRain: false,
    popScale: 0.8
  });
}
