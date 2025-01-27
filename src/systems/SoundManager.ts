import * as Tone from 'tone';

export class SoundManager {
    private static instance: SoundManager;
    private noiseSynth: Tone.NoiseSynth;
    private metalSynth: Tone.MetalSynth;
    private membraneSynth: Tone.MembraneSynth;
    private initialized: boolean = false;
    private lastPlayTime: number = 0;
    private readonly MIN_TIME_BETWEEN_SOUNDS = 0.05; // 50ms minimum between sounds

    private constructor() {
        // Initialize noise synthesizer for whooshes and impacts
        this.noiseSynth = new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: {
                attack: 0.005,
                decay: 0.1,
                sustain: 0,
                release: 0.1
            }
        }).toDestination();
        this.noiseSynth.volume.value = -20;

        // Initialize metal synthesizer for weapon sounds
        this.metalSynth = new Tone.MetalSynth({
            envelope: {
                attack: 0.001,
                decay: 0.1,
                release: 0.1
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            octaves: 1.5
        }).toDestination();
        this.metalSynth.volume.value = -25;

        // Initialize membrane synthesizer for impacts and low hits
        this.membraneSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 4,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0,
                release: 0.4,
                attackCurve: 'exponential'
            }
        }).toDestination();
        this.membraneSynth.volume.value = -15;
    }

    private getNextValidTime(): number {
        const now = Tone.now();
        this.lastPlayTime = Math.max(now, this.lastPlayTime + this.MIN_TIME_BETWEEN_SOUNDS);
        return this.lastPlayTime;
    }

    private safePlay(callback: () => void): void {
        try {
            callback();
        } catch (error) {
            console.warn('Sound playback error:', error);
        }
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public async initialize(): Promise<void> {
        if (!this.initialized) {
            try {
                await Tone.start();
                this.initialized = true;
            } catch (error) {
                console.warn('Failed to initialize audio:', error);
            }
        }
    }

    public playSwingSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            // Quick whoosh sound
            this.noiseSynth.triggerAttackRelease('0.02s', time, 0.5);
            
            // Initial metallic impact
            this.metalSynth.triggerAttackRelease('A5', '32n', time, 0.4);
            
            // Descending metallic trail for the slash feel
            this.metalSynth.triggerAttackRelease('E5', '16n', time + 0.02, 0.3);
            this.metalSynth.triggerAttackRelease('C5', '32n', time + 0.04, 0.2);
            
            // Additional air cutting sound
            this.noiseSynth.triggerAttackRelease('0.08s', time + 0.01, 0.2);
        });
    }

    public playHitSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            // Create a "dwoop" noise
            this.membraneSynth.triggerAttackRelease('G2', '8n', time, 0.6);
            this.metalSynth.triggerAttackRelease('E3', '8n', time + 0.05, 0.5);
            this.noiseSynth.triggerAttackRelease('0.1s', time + 0.1, 0.3);
        });
    }

    public playDashSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            this.noiseSynth.triggerAttackRelease('0.15s', time, 0.4);
        });
    }

    public playHealSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            this.metalSynth.triggerAttackRelease('C4', '8n', time, 0.2);
            this.noiseSynth.triggerAttackRelease('0.2s', time + 0.01, 0.1);
        });
    }

    public playDamageSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            this.membraneSynth.triggerAttackRelease('G1', '8n', time, 0.7);
            this.noiseSynth.triggerAttackRelease('0.1s', time + 0.01, 0.5);
        });
    }

    public playGameOverSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            this.membraneSynth.triggerAttackRelease('C1', '2n', time, 0.8);
            this.noiseSynth.triggerAttackRelease('0.5s', time + 0.01, 0.3);
        });
    }

    public playWaveStartSound(): void {
        this.safePlay(() => {
            const time = this.getNextValidTime();
            this.membraneSynth.triggerAttackRelease('G2', '8n', time, 0.6);
            this.metalSynth.triggerAttackRelease('C4', '16n', time + 0.01, 0.4);
        });
    }
} 