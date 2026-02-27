import './style.css';
import { Tetris } from './tetris';
import { GameAudio } from './audio';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="game-container">
    <canvas id="game-canvas" width="300" height="600"></canvas>
    <div id="pause-screen" class="pause-screen">
      <h2>Paused</h2>
      <p>[P] / [Esc] to resume</p>
    </div>
    <div id="game-over" class="game-over">
      <h2>Game Over</h2>
      <button id="restart-btn">Try Again</button>
    </div>
  </div>
  <div class="side-panel">
    <div class="info">Score<br><span id="score">0</span></div>
    <div class="info" style="margin-top: 40px; margin-bottom: 10px;">Next</div>
    <canvas id="next-canvas" width="120" height="120"></canvas>
    <button id="mute-btn" class="mute-btn">🎵 BGM ON</button>
    <div class="info" style="font-size: 0.8rem; margin-top: auto; opacity: 0.7; font-weight: normal;">
      [P] or [Esc]<br>to Pause
    </div>
  </div>
`;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;
const nextCtx = nextCanvas.getContext('2d')!;
const scoreElement = document.getElementById('score')!;
const gameOverScreen = document.getElementById('game-over')!;
const pauseScreen = document.getElementById('pause-screen')!;
const restartBtn = document.getElementById('restart-btn')!;
const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;

const audioContext = new GameAudio();
let hasStartedAudio = false;

const tetris = new Tetris(
  ctx,
  nextCtx,
  (score) => {
    scoreElement.textContent = score.toString();
  },
  () => {
    audioContext.stop();
    gameOverScreen.classList.add('active');
  },
  () => {
    // onLineClear callback
    audioContext.playClearSound();
  }
);

muteBtn.addEventListener('click', () => {
  const isMuted = audioContext.toggleMute();
  muteBtn.textContent = isMuted ? '🔇 BGM OFF' : '🎵 BGM ON';
  muteBtn.blur();
});

restartBtn.addEventListener('click', () => {
  gameOverScreen.classList.remove('active');
  pauseScreen.classList.remove('active');
  tetris.start();
  audioContext.start();
  restartBtn.blur();
});

tetris.start();

document.addEventListener('keydown', (e) => {
  if (!hasStartedAudio) {
    audioContext.init();
    audioContext.start();
    hasStartedAudio = true;
  }

  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    tetris.togglePause();
    if (tetris.getIsPaused()) {
      pauseScreen.classList.add('active');
      audioContext.pause();
    } else {
      pauseScreen.classList.remove('active');
      audioContext.start(); // Resumes where it left off
    }
  } else {
    tetris.handleInput(e.key);
  }
});
