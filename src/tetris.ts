const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

const SHAPES = [
    [],
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

export class Tetris {
    private board: number[][];
    private ctx: CanvasRenderingContext2D;
    private nextCtx: CanvasRenderingContext2D;
    private onScoreUpdate: (score: number) => void;
    private onGameOver: () => void;
    private onLineClear: () => void;
    private score: number = 0;
    private isGameOver: boolean = false;
    private isPaused: boolean = false;

    private piece: { matrix: number[][], pos: { x: number, y: number } } | null = null;
    private nextPiece: { matrix: number[][] } | null = null;
    private dropCounter = 0;
    private dropInterval = 1000;
    private lastTime = 0;
    private timerId = 0;

    private particles: Particle[] = [];

    constructor(
        ctx: CanvasRenderingContext2D,
        nextCtx: CanvasRenderingContext2D,
        onScoreUpdate: (score: number) => void,
        onGameOver: () => void,
        onLineClear: () => void
    ) {
        this.ctx = ctx;
        this.nextCtx = nextCtx;
        this.onScoreUpdate = onScoreUpdate;
        this.onGameOver = onGameOver;
        this.onLineClear = onLineClear;
        this.board = this.createMatrix(COLS, ROWS);

        // Scale the contexts
        this.ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
        this.nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);
    }

    private createMatrix(w: number, h: number) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }

    private createPiece(type: number) {
        return SHAPES[type] as number[][];
    }

    private drawMatrix(ctx: CanvasRenderingContext2D, matrix: number[][], offset: { x: number, y: number }) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const color = COLORS[value];
                    if (color) {
                        ctx.fillStyle = color;
                        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                        // Add grid/border
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.lineWidth = 0.05;
                        ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);

                        // Adding a little shine/gradient effect for a premium look
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fillRect(x + offset.x, y + offset.y, 1, 0.2);
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                        ctx.fillRect(x + offset.x, y + offset.y + 0.8, 1, 0.2);
                    }
                }
            });
        });
    }

    private draw() {
        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, COLS, ROWS);

        // Draw background grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 0.02;
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                this.ctx.strokeRect(x, y, 1, 1);
            }
        }

        this.drawMatrix(this.ctx, this.board, { x: 0, y: 0 });

        if (this.piece) {
            this.drawMatrix(this.ctx, this.piece.matrix, this.piece.pos);
        }

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life);
            // Create a glowing effect for particles
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fillRect(p.x, p.y, 0.4, 0.4);
            this.ctx.shadowBlur = 0;
        });
        this.ctx.globalAlpha = 1.0;

        this.drawNextPiece();
    }

    private drawNextPiece() {
        this.nextCtx.fillStyle = '#111';
        this.nextCtx.fillRect(0, 0, 4, 4);

        if (this.nextPiece) {
            // Offset to center the next piece in its 4x4 grid (120x120px -> 4x4 blocks of 30px)
            const m = this.nextPiece.matrix;
            const offsetX = (4 - m[0].length) / 2;
            const offsetY = (4 - m.length) / 2;
            this.drawMatrix(this.nextCtx, m, { x: offsetX, y: offsetY });
        }
    }

    private merge(board: number[][], piece: { matrix: number[][], pos: { x: number, y: number } }) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + piece.pos.y][x + piece.pos.x] = value;
                }
            });
        });
    }

    private collide(board: number[][], piece: { matrix: number[][], pos: { x: number, y: number } }) {
        const m = piece.matrix;
        const o = piece.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                    (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private playerDrop() {
        if (!this.piece || this.isGameOver) return;
        this.piece.pos.y++;
        if (this.collide(this.board, this.piece)) {
            this.piece.pos.y--;
            this.merge(this.board, this.piece);
            this.resetPiece();
            this.sweep();
        }
        this.dropCounter = 0;
    }

    private playerMove(offset: number) {
        if (!this.piece || this.isGameOver) return;
        this.piece.pos.x += offset;
        if (this.collide(this.board, this.piece)) {
            this.piece.pos.x -= offset;
        }
    }

    private playerRotate(dir: number) {
        if (!this.piece || this.isGameOver) return;
        const pos = this.piece.pos.x;
        let offset = 1;
        this.rotate(this.piece.matrix, dir);
        while (this.collide(this.board, this.piece)) {
            this.piece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.piece.matrix[0].length) {
                this.rotate(this.piece.matrix, -dir);
                this.piece.pos.x = pos;
                return;
            }
        }
    }

    private rotate(matrix: number[][], dir: number) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    private resetPiece() {
        if (!this.nextPiece) {
            const type = Math.floor(Math.random() * 7) + 1;
            this.nextPiece = { matrix: this.createPiece(type) };
        }

        this.piece = {
            matrix: this.nextPiece.matrix,
            pos: { x: Math.floor(COLS / 2) - Math.floor(this.nextPiece.matrix[0].length / 2), y: 0 }
        };

        const nextType = Math.floor(Math.random() * 7) + 1;
        this.nextPiece = { matrix: this.createPiece(nextType) };

        if (this.collide(this.board, this.piece)) {
            this.isGameOver = true;
            this.onGameOver();
        }
    }

    private sweep() {
        let rowCount = 1;
        let swept = false;

        outer: for (let y = this.board.length - 1; y >= 0; --y) {
            for (let x = 0; x < this.board[y].length; ++x) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }

            // Create particles for the cleared line
            for (let px = 0; px < COLS; px++) {
                const value = this.board[y][px];
                const color = COLORS[value] || '#fff';
                for (let i = 0; i < 5; i++) {
                    this.particles.push({
                        x: px + Math.random(),
                        y: y + Math.random(),
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: (Math.random() - 0.5) * 0.4 - 0.2, // slightly upwards
                        life: 1.0,
                        color
                    });
                }
            }

            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            ++y;
            this.score += rowCount * 10;
            rowCount *= 2;
            swept = true;
        }

        if (swept) {
            this.onLineClear();
            this.onScoreUpdate(this.score);
            // Speed up slightly
            this.dropInterval = Math.max(100, this.dropInterval - 20);
        }
    }

    private update(time = 0) {
        if (this.isGameOver || this.isPaused) return; // Stop updating if game is over or paused

        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }

        // Update particles
        const timeScale = deltaTime ? deltaTime / 16 : 1;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.vy += 0.015 * timeScale; // gravity
            p.life -= 0.02 * timeScale;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        this.draw();
        this.timerId = requestAnimationFrame(this.update.bind(this));
    }

    public getIsPaused(): boolean {
        return this.isPaused;
    }

    public togglePause() {
        if (this.isGameOver) return;
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastTime = performance.now();
            this.update(this.lastTime);
        }
    }

    public start() {
        if (this.timerId !== 0) {
            cancelAnimationFrame(this.timerId);
        }
        this.board.forEach(row => row.fill(0));
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.onScoreUpdate(this.score);
        this.dropInterval = 1000;
        this.particles = [];
        this.resetPiece();
        this.lastTime = performance.now();
        this.update(this.lastTime);
    }

    public handleInput(key: string) {
        if (this.isGameOver || this.isPaused) return;
        switch (key) {
            case 'ArrowLeft':
                this.playerMove(-1);
                break;
            case 'ArrowRight':
                this.playerMove(1);
                break;
            case 'ArrowDown':
                this.playerDrop();
                break;
            case 'ArrowUp':
                this.playerRotate(1);
                break;
        }
    }
}
