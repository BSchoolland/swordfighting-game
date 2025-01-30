// ZzFX - Zuper Zmall Zound Zynth - Micro Edition
// MIT License - Copyright 2019 Frank Force
// https://github.com/KilledByAPixel/ZzFX

let sharedContext: AudioContext | null = null;

export const zzfx = (...parameters: number[]) => {
    // Initialize or resume context if needed
    if (!sharedContext) {
        sharedContext = new AudioContext();
    } else if (sharedContext.state === 'suspended') {
        sharedContext.resume();
    }
    
    // Clean up old nodes periodically
    cleanupOldNodes();
    
    const sampleRate = 44100;
    const buffer = zzfxG(...parameters);
    const source = sharedContext.createBufferSource();
    const audioBuffer = sharedContext.createBuffer(1, buffer.length, sampleRate);
    audioBuffer.getChannelData(0).set(buffer);
    source.buffer = audioBuffer;
    source.connect(sharedContext.destination);
    source.start();
    
    // Store node for cleanup
    activeNodes.push({
        node: source,
        endTime: sharedContext.currentTime + (buffer.length / sampleRate)
    });
    
    return source;
}

// Track active audio nodes for cleanup
interface AudioNode {
    node: AudioBufferSourceNode;
    endTime: number;
}

const activeNodes: AudioNode[] = [];

// Cleanup function to remove finished nodes
function cleanupOldNodes() {
    if (!sharedContext) return;
    
    const currentTime = sharedContext.currentTime;
    let i = activeNodes.length;
    
    while (i--) {
        if (activeNodes[i].endTime < currentTime) {
            activeNodes.splice(i, 1);
        }
    }
}

const zzfxG = (...parameters: number[]) => {
    // Initialize parameters
    let [volume = 1, randomness = .05, frequency = 220, attack = 0, sustain = 0,
        release = .1, shape = 0, shapeCurve = 1, slide = 0, deltaSlide = 0,
        pitchJump = 0, pitchJumpTime = 0, repeatTime = 0, noise = 0, modulation = 0,
        bitCrush = 0, delay = 0, sustainVolume = 1, decay = 0, tremolo = 0] = parameters;
    
    // Init parameters
    let PI2 = Math.PI * 2,
        sampleRate = 44100,
        startSlide = slide *= 500 * PI2 / sampleRate / sampleRate,
        startFrequency = frequency *= (1 + randomness * 2 * Math.random() - randomness) * PI2 / sampleRate,
        b = [], t = 0, tm = 0, i = 0, j = 1, r = 0, c = 0, s = 0, f, length;

    // Scale by sample rate
    attack = attack * sampleRate + 9; // minimum attack
    decay *= sampleRate;
    sustain *= sampleRate;
    release *= sampleRate;
    delay *= sampleRate;
    deltaSlide *= 500 * PI2 / sampleRate ** 3;
    modulation *= PI2 / sampleRate;
    pitchJump *= PI2 / sampleRate;
    pitchJumpTime *= sampleRate;
    repeatTime = repeatTime * sampleRate | 0;

    // Generate waveform
    length = attack + decay + sustain + release + delay | 0;
    for (; i < length; b[i++] = s) {
        if (!(++c % (bitCrush * 100 | 0))) {                      // Bit crush
            s = shape ? shape > 1 ? shape > 2 ? shape > 3 ?         // Wave shape
                Math.sin((t % PI2) ** 3) :                          // 4 noise
                Math.max(Math.min(Math.tan(t), 1), -1) :           // 3 tan
                1 - (2 * t / PI2 % 2 + 2) % 2 :                    // 2 saw
                1 - 4 * Math.abs(Math.round(t / PI2) - t / PI2) :  // 1 triangle
                Math.sin(t);                                        // 0 sin

            s = (repeatTime ? 1 - tremolo + tremolo * Math.sin(PI2 * i / repeatTime) // tremolo
                : 1) * sign(s) * Math.abs(s) ** shapeCurve *       // curve 0=square, 2=pointy
                volume * (                                          // envelope
                i < attack ? i / attack :                          // attack
                i < attack + decay ?                               // decay
                1 - ((i - attack) / decay) * (1 - sustainVolume) : // decay falloff
                i < attack + decay + sustain ?                     // sustain
                sustainVolume :                                    // sustain volume
                i < length - delay ?                               // release
                (length - i - delay) / release *                   // release falloff
                sustainVolume :                                    // release volume
                0);                                               // post release

            s = delay ? s / 2 + (delay > i ? 0 :                    // delay
                (i < length - delay ? 1 : (length - i) / delay) *   // release delay 
                b[i - delay | 0] / 2) : s;                         // sample delay
        }

        f = (frequency += slide += deltaSlide) *                    // frequency
            Math.cos(modulation * tm++);                           // modulation
        t += f - f * noise * (1 - (Math.sin(i) + 1) * 1e9 % 2);   // noise

        if (j && ++j > pitchJumpTime) {                          // pitch jump
            frequency += pitchJump;                                // apply pitch jump
            startFrequency += pitchJump;                          // also apply to start
            j = 0;                                                // reset pitch jump time
        }

        if (repeatTime && !(++r % repeatTime)) {                 // repeat
            frequency = startFrequency;                            // reset frequency
            slide = startSlide;                                    // reset slide
            j ||= 1;                                              // reset pitch jump time
        }
    }
    return b;
}

const sign = (value: number) => value > 0 ? 1 : -1;              // Math.sign not supported on IE

export class SoundManager {
    private static instance: SoundManager;
    private initialized: boolean = false;
    private backgroundMusic: HTMLAudioElement | null = null;
    private musicVolume: number = 0.5; // 50% volume by default
    private lastPlayTimes: {
        combat: number;    // For hit, heavy hit, parry
        movement: number;  // For dash, swing
        ambient: number;   // For powerup, heal, etc.
    } = {
        combat: 0,
        movement: 0,
        ambient: 0
    };

    // Different minimum times between sounds for different categories
    private readonly MIN_TIME_BETWEEN_SOUNDS = {
        combat: 0.02,   // 20ms - Very responsive for combat
        movement: 0.05, // 50ms - Standard for movement
        ambient: 0.1    // 100ms - Longer for ambient/UI sounds
    };

    private bossMusic: HTMLAudioElement | null = null;

    private constructor() {}

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public async initialize(): Promise<void> {
        if (!this.initialized) {
            // Initialize background music
            this.backgroundMusic = new Audio('/audio/background_music.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = this.musicVolume;

            // Initialize boss music
            this.bossMusic = new Audio('/audio/background_music_boss.mp3');
            this.bossMusic.loop = true;
            this.bossMusic.volume = 0; // Start at 0 for fade in
            
            // Add error handling
            this.backgroundMusic.onerror = (e) => {
                console.error('Error loading background music:', e);
            };

            this.bossMusic.onerror = (e) => {
                console.error('Error loading boss music:', e);
            };

            this.initialized = true;
        }
    }

    private fadeOut(audio: HTMLAudioElement, duration: number = 1000): Promise<void> {
        return new Promise((resolve) => {
            const startVolume = audio.volume;
            const steps = 20;
            const volumeStep = startVolume / steps;
            const intervalTime = duration / steps;
            
            const interval = setInterval(() => {
                if (audio.volume > volumeStep) {
                    audio.volume = Math.max(0, audio.volume - volumeStep);
                } else {
                    audio.volume = 0;
                    audio.pause();
                    clearInterval(interval);
                    resolve();
                }
            }, intervalTime);
        });
    }

    private fadeIn(audio: HTMLAudioElement, targetVolume: number, duration: number = 1000): Promise<void> {
        return new Promise((resolve) => {
            audio.volume = 0;
            audio.play();
            
            const steps = 20;
            const volumeStep = targetVolume / steps;
            const intervalTime = duration / steps;
            
            const interval = setInterval(() => {
                if (audio.volume < targetVolume - volumeStep) {
                    audio.volume = Math.min(targetVolume, audio.volume + volumeStep);
                } else {
                    audio.volume = targetVolume;
                    clearInterval(interval);
                    resolve();
                }
            }, intervalTime);
        });
    }

    public async transitionToBossMusic(): Promise<void> {
        if (this.backgroundMusic && this.bossMusic) {
            await this.fadeOut(this.backgroundMusic);
            await this.fadeIn(this.bossMusic, this.musicVolume);
        }
    }

    public async transitionToNormalMusic(): Promise<void> {
        if (this.backgroundMusic && this.bossMusic) {
            await this.fadeOut(this.bossMusic);
            await this.fadeIn(this.backgroundMusic, this.musicVolume);
        }
    }

    public startBackgroundMusic(): void {
        if (this.backgroundMusic) {
            // Some browsers require user interaction before playing audio
            try {
                this.backgroundMusic.play().catch(error => {
                    console.warn('Could not autoplay background music:', error);
                });
            } catch (error) {
                console.warn('Error playing background music:', error);
            }
        }
    }

    public stopBackgroundMusic(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.musicVolume;
        }
    }

    private canPlaySound(category: 'combat' | 'movement' | 'ambient'): boolean {
        const now = performance.now() / 1000;
        if (now - this.lastPlayTimes[category] < this.MIN_TIME_BETWEEN_SOUNDS[category]) {
            return false;
        }
        this.lastPlayTimes[category] = now;
        return true;
    }

    public playSwingSound(): void {
        if (!this.canPlaySound('movement')) return;
        // Swoosh with metallic quality
        zzfx(.2,.05,477,.1,.01,.17,2,3,12,12,0,0,0,.2,32,0,0,.63,.17,.2,0);
    }

    public playHitSound(): void {
        if (!this.canPlaySound('combat')) return;
        // Impactful hit with some crunch
        zzfx(2,.05,722,.01,.03,.03,2,2.3,-21,-29.9,0,0,0,0,13,.1,.07,.67,.02,0,0);
    }

    public playDashSound(): void {
        if (!this.canPlaySound('movement')) return;
        // Quick whoosh
        zzfx(0.5,.05,504,.01,.03,.04,2,3,26,0,-150,0,0,.3,0,0,0,.66,.02,.06,0);
    }

    public playHealSound(): void {
        if (!this.canPlaySound('ambient')) return;
        // Sparkly healing sound
        zzfx(.7, .05, 1200, 0, .1, .2, 1, 6, 10, 50, 0, 0, 0, 0, 0, .1, .1, .8, .1);
    }

    public playDamageSound(): void {
        if (!this.canPlaySound('combat')) return;
        // Harsh impact with lower frequency for more "oomph"
        zzfx(1.1,.05,779,0,.04,.03,4,.7,0,-16,44,.26,0,0,0,.8,0,.9,.01,.06,0);
    }

    public playHeavyDamageSound(): void {
        if (!this.canPlaySound('combat')) return;
        // More intense version of damage sound for critical hits
        
    }

    public playParrySound(): void {
        if (!this.canPlaySound('combat')) return;
        // Metallic clash sound
        zzfx(1, .05, 1800, .03, .02, .08, 2, 2, -15);
        setTimeout(() => {
            zzfx(.7, .05, 1200, 0, .01, .1, 1, 1, -8);
        }, 20);
    }

    public playEnemyShootSound(): void {
        if (!this.canPlaySound('combat')) return;
        // Enemy projectile launch sound
        zzfx(2.1,.05,370,0,.06,.19,0,.2,-3,-1,0,0,0,0,0,0,.17,.9,.15,0,959);
    }

    public playPowerUpSound(): void {
        if (!this.canPlaySound('ambient')) return;
        // Rising pitch with sparkly effect
    }

    public playGameOverSound(): void {
        if (!this.canPlaySound('ambient')) return;
        // Dramatic descending tone
        zzfx(1, .05, 240, .3, .5, .3, 1, -4, -0.5);
    }

    public playWaveStartSound(): void {
        if (!this.canPlaySound('ambient')) return;
        // Rising alert sound
        zzfx(0.7,.05,520,.04,.18,.24,1,3.1,-6,0,17,.05,.08,0,0,0,0,.87,.27,.48,0);
    }

    public playBossDeathSound(): void {
        if (!this.canPlaySound('ambient')) return;
        // Epic explosion with reverb-like effect
        zzfx(2.1,.05,64,.04,.21,.64,4,3.3,-5,0,0,0,0,1.2,0,.4,.24,.33,.28,0,0);
    }
} 