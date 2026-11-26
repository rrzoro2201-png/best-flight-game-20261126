// Langit Senja — input: keyboard and mouse, one small state object.
// Arrow keys or WASD fly the plane; Space boosts; P pauses; M mutes;
// 1, 2 and 3 pick a sortie; Enter and R start or restart.
export function makeInput() {
  return {
    keys: new Set(),
    clicked: null, // { x, y } of the latest canvas click, consumed by the game
    down(code) {
      return this.keys.has(code);
    },
  };
}

export function controlFromInput(input) {
  const up = input.down('ArrowUp') || input.down('KeyW');
  const down = input.down('ArrowDown') || input.down('KeyS');
  const right = input.down('ArrowRight') || input.down('KeyD');
  const left = input.down('ArrowLeft') || input.down('KeyA');
  return {
    climb: up ? 1 : down ? -1 : 0,
    throttle: right ? 1 : left ? -1 : 0,
    boost: input.down('Space'),
  };
}

export function attachInput(input, canvas) {
  const watch = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    input.keys.add(event.code);
  };
  const release = (event) => input.keys.delete(event.code);
  window.addEventListener('keydown', watch);
  window.addEventListener('keyup', release);
  window.addEventListener('blur', () => input.keys.clear());
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.clicked = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  });
}
