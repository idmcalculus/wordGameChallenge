/**
 * Creates a confetti celebration effect
 */
export function createConfetti() {
  const colors = ['#3b63a4', '#5f84bf', '#a7ceda', '#4caf50', '#f57c00', '#6e809a', '#ffffff'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    createConfettiPiece(colors);
  }
}

function createConfettiPiece(colors: string[]): void {
  const confetti = document.createElement('div');
  confetti.className = 'confetti-piece';
  
  // Random color
  const color = colors[Math.floor(Math.random() * colors.length)];
  confetti.style.backgroundColor = color;
  
  // Random starting position
  const startX = Math.random() * window.innerWidth;
  confetti.style.left = startX + 'px';
  confetti.style.top = '-10px';
  
  // Random size
  const size = Math.random() * 10 + 5;
  confetti.style.width = size + 'px';
  confetti.style.height = size + 'px';
  
  // Random rotation
  const rotation = Math.random() * 360;
  confetti.style.transform = `rotate(${rotation}deg)`;
  
  // Random animation duration
  const duration = Math.random() * 3 + 2;
  confetti.style.animationDuration = duration + 's';
  
  // Random horizontal drift
  const drift = (Math.random() - 0.5) * 200;
  confetti.style.setProperty('--drift', drift + 'px');
  
  document.body.appendChild(confetti);
  
  // Remove after animation
  setTimeout(() => {
    confetti.remove();
  }, duration * 1000);
}

/**
 * Creates a firework particle effect at a specific position
 */
export function createFirework(x: number, y: number): void {
  const colors = ['#3b63a4', '#5f84bf', '#a7ceda', '#4caf50', '#f57c00', '#6e809a'];
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'firework-particle';
    
    // Random color
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 10px ${color}`;
    
    // Position at click location
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    // Random angle for explosion
    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = Math.random() * 100 + 50;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    
    particle.style.setProperty('--vx', vx + 'px');
    particle.style.setProperty('--vy', vy + 'px');
    
    document.body.appendChild(particle);
    
    // Remove after animation
    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}
