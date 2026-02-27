export class GameAudio {
    private audioCtx: AudioContext | null = null;
    private isPlaying = false;
    private nextNoteTime = 0;
    private currentNote = 0;
    private timerId = 0;
    private tempo = 130;
    private isMuted = false;

    // Classic Tetris (Korobeiniki) style melody
    // Notes in half-steps from A4 (440Hz)
    // E5 = 7, B4 = 2, C5 = 3, D5 = 5, A4 = 0, G#4 = -1, F4 = -4
    private melody = [
        { note: 7, duration: 1 },    // E5
        { note: 2, duration: 0.5 },  // B4
        { note: 3, duration: 0.5 },  // C5
        { note: 5, duration: 1 },    // D5
        { note: 3, duration: 0.5 },  // C5
        { note: 2, duration: 0.5 },  // B4
        { note: 0, duration: 1 },    // A4
        { note: 0, duration: 0.5 },  // A4
        { note: 3, duration: 0.5 },  // C5
        { note: 7, duration: 1 },    // E5
        { note: 5, duration: 0.5 },  // D5
        { note: 3, duration: 0.5 },  // C5
        { note: 2, duration: 1.5 },  // B4
        { note: 3, duration: 0.5 },  // C5
        { note: 5, duration: 1 },    // D5
        { note: 7, duration: 1 },    // E5
        { note: 3, duration: 1 },    // C5
        { note: 0, duration: 1 },    // A4
        { note: 0, duration: 1 },    // A4
        { note: null, duration: 1 }, // Rest

        { note: 5, duration: 1 },    // D5
        { note: 8, duration: 0.5 },  // F5
        { note: 12, duration: 1.5 }, // A5
        { note: 10, duration: 0.5 }, // G5
        { note: 8, duration: 0.5 },  // F5
        { note: 7, duration: 1.5 },  // E5
        { note: 3, duration: 0.5 },  // C5
        { note: 7, duration: 1 },    // E5
        { note: 5, duration: 0.5 },  // D5
        { note: 3, duration: 0.5 },  // C5
        { note: 2, duration: 1 },    // B4
        { note: 2, duration: 0.5 },  // B4
        { note: 3, duration: 0.5 },  // C5
        { note: 5, duration: 1 },    // D5
        { note: 7, duration: 1 },    // E5
        { note: 3, duration: 1 },    // C5
        { note: 0, duration: 1 },    // A4
        { note: 0, duration: 1 },    // A4
        { note: null, duration: 1 }  // Rest
    ];

    public init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    public toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    private playNote(noteInfo: { note: number | null, duration: number }, time: number) {
        if (!this.audioCtx || noteInfo.note === null || this.isMuted) return;

        // Calculate frequency
        const freq = 440 * Math.pow(2, noteInfo.note / 12);
        const secsPerBeat = 60.0 / this.tempo;
        const duration = noteInfo.duration * secsPerBeat;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'square'; // 8-bit NES style waveform
        osc.frequency.value = freq;

        // Envelope to avoid clicking and sound more staccato/8-bit
        gainNode.gain.setValueAtTime(0.04, time);
        gainNode.gain.linearRampToValueAtTime(0.04, time + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, time + duration - 0.01);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start(time);
        osc.stop(time + duration);
    }

    private scheduler = () => {
        if (!this.isPlaying || !this.audioCtx) return;

        // Schedule notes slightly ahead of current time
        while (this.nextNoteTime < this.audioCtx.currentTime + 0.1) {
            const noteInfo = this.melody[this.currentNote];
            const secsPerBeat = 60.0 / this.tempo;

            this.playNote(noteInfo, this.nextNoteTime);

            this.nextNoteTime += noteInfo.duration * secsPerBeat;
            this.currentNote = (this.currentNote + 1) % this.melody.length;
        }

        this.timerId = requestAnimationFrame(this.scheduler);
    }

    public start() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Reset if we're starting fresh
        if (this.currentNote === 0 || !this.audioCtx) {
            this.nextNoteTime = this.audioCtx ? this.audioCtx.currentTime + 0.1 : 0;
        } else {
            // Resuming
            this.nextNoteTime = this.audioCtx ? this.audioCtx.currentTime + 0.1 : 0;
        }

        this.scheduler();
    }

    public pause() {
        this.isPlaying = false;
        cancelAnimationFrame(this.timerId);
    }

    public stop() {
        this.isPlaying = false;
        cancelAnimationFrame(this.timerId);
        this.currentNote = 0;
    }

    // A simple sound effect for clearing a line
    public playClearSound() {
        if (!this.audioCtx || this.isMuted) return;

        const time = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, time);
        osc.frequency.exponentialRampToValueAtTime(800, time + 0.1);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(time);
        osc.stop(time + 0.2);
    }
}
