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
    private bossMusic: HTMLAudioElement | null = null;
    private isMusicMuted: boolean = false;
    private isSoundEffectsMuted: boolean = false;
    private lastPlayTimes: {
        combat: number;    // For hit, heavy hit, parry
        movement: number;  // For dash, swing
        ambient: number;   // For powerup, heal, etc.
        important: number; // For wave start, boss death, etc.
    } = {
        combat: 0,
        movement: 0,
        ambient: 0,
        important: 0
    };

    // Different minimum times between sounds for different categories
    private readonly MIN_TIME_BETWEEN_SOUNDS = {
        combat: 0.02,   // 20ms - Very responsive for combat
        movement: 0.05, // 50ms - Standard for movement
        ambient: 0.1,    // 100ms - Longer for ambient/UI sounds,
        important: 0.01 // 10ms - Very responsive for important sounds
    };

    private constructor() {
        // Load saved settings from localStorage
        this.loadSettings();
    }

    private loadSettings(): void {
        const settings = localStorage.getItem('sound_settings');
        if (settings) {
            const { musicMuted, sfxMuted } = JSON.parse(settings);
            this.isMusicMuted = musicMuted;
            this.isSoundEffectsMuted = sfxMuted;
        }
    }

    private saveSettings(): void {
        const settings = {
            musicMuted: this.isMusicMuted,
            sfxMuted: this.isSoundEffectsMuted
        };
        localStorage.setItem('sound_settings', JSON.stringify(settings));
    }

    public isMusicEnabled(): boolean {
        return !this.isMusicMuted;
    }

    public isSoundEffectsEnabled(): boolean {
        return !this.isSoundEffectsMuted;
    }

    public setMusicEnabled(enabled: boolean): void {
        this.isMusicMuted = !enabled;
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = enabled ? this.musicVolume : 0;
        }
        if (this.bossMusic) {
            this.bossMusic.volume = enabled ? this.musicVolume : 0;
        }
        this.saveSettings();
    }

    public setSoundEffectsEnabled(enabled: boolean): void {
        this.isSoundEffectsMuted = !enabled;
        this.saveSettings();
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public async initialize(): Promise<void> {
        if (!this.initialized) {
            this.backgroundMusic = new Audio('./audio/background_music.mp3');
            this.backgroundMusic.loop = true;
            this.backgroundMusic.volume = this.isMusicMuted ? 0 : this.musicVolume;

            this.bossMusic = new Audio('./audio/background_music_boss.mp3');
            this.bossMusic.loop = true;
            this.bossMusic.volume = 0;

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
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Error starting audio playback:', error);
                    resolve();
                    return;
                });
            }
            
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
            const targetVolume = this.isMusicMuted ? 0 : this.musicVolume;
            await this.fadeOut(this.backgroundMusic);
            this.backgroundMusic.pause();
            this.bossMusic.currentTime = 0;
            await this.fadeIn(this.bossMusic, targetVolume);
        }
    }

    public async transitionToNormalMusic(): Promise<void> {
        if (this.backgroundMusic && this.bossMusic) {
            const targetVolume = this.isMusicMuted ? 0 : this.musicVolume;
            await this.fadeOut(this.bossMusic);
            this.bossMusic.pause();
            this.backgroundMusic.currentTime = 0;
            await this.fadeIn(this.backgroundMusic, targetVolume);
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

    private canPlaySound(category: 'combat' | 'movement' | 'ambient' | 'important'): boolean {
        const now = performance.now() / 1000;
        if (now - this.lastPlayTimes[category] < this.MIN_TIME_BETWEEN_SOUNDS[category]) {
            return false;
        }
        this.lastPlayTimes[category] = now;
        return true;
    }

    public playSwingSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('movement')) return;
        zzfx(.2,.05,477,.1,.01,.17,2,3,12,12,0,0,0,.2,32,0,0,.63,.17,.2,0);
    }

    public playHitSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('combat')) return;
        zzfx(2,.05,722,.01,.03,.03,2,2.3,-21,-29.9,0,0,0,0,13,.1,.07,.67,.02,0,0);
    }

    public playCriticalHitSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('combat')) return;
        // More impactful sound for critical hits
        zzfx(2,.05,700,.01,.03,.05,1,2.7,-21,-29.9,89,.5,.1,0,13,.1,.07,.67,.02,0,0);
    }

    public playDashSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('movement')) return;
        zzfx(0.5,.05,504,.01,.03,.04,2,3,26,0,-150,0,0,.3,0,0,0,.66,.02,.06,0);
    }

    public playHealSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('ambient')) return;
        // zzfx(.7, .05, 1200, 0, .1, .2, 1, 6, 10, 50, 0, 0, 0, 0, 0, .1, .1, .8, .1);
    }

    public playDamageSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('combat')) return;
        zzfx(1.1,.05,779,0,.04,.03,4,.7,0,-16,44,.26,0,0,0,.8,0,.9,.01,.06,0);
    }

    public playParrySound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('combat')) return;
        zzfx(1, .05, 1800, .03, .02, .08, 2, 2, -15);
        setTimeout(() => {
            if (!this.isSoundEffectsMuted) {
                zzfx(.7, .05, 1200, 0, .01, .1, 1, 1, -8);
            }
        }, 20);
    }

    public playEnemyShootSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('combat')) return;
        zzfx(2.1,.05,370,0,.06,.19,0,.2,-3,-1,0,0,0,0,0,0,.17,.9,.15,0,959);
    }

    public playPowerUpSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('ambient')) return;
        // A gentler, more pleasant chime sound
        zzfx(.4,.05,440,.3,.15,.2,2,2.1,0,0,50,.05,.08,0,0,.1,.1,.7,.1,.3,0);

    }

    public playGameOverSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('important')) return;
        zzfx(1, .05, 240, .3, .5, .3, 1, -4, -0.5);
    }

    public playWaveStartSound(): void {
        console.log("playWaveStartSound");
        if (this.isSoundEffectsMuted || !this.canPlaySound('important')) return;
        // A softer, more atmospheric wave start sound
        zzfx(.3,.05,880,.2,.1,.15,0,2.5,0,0,200,.02,.02,0,0,.1,.1,.6,.05,.5,0);

    }

    public playBossDeathSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('important')) return;
        zzfx(2.1,.05,64,.04,.21,.64,4,3.3,-5,0,0,0,0,1.2,0,.4,.24,.33,.28,0,0);
    }

    public playMenuSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('ambient')) return;
        zzfx(.3,.05,980,.01,.03,.08,1,.5,0,0,0,0,0,0,0,0,0,.5,.01,0,0);
    }

    public playUpgradeSound(): void {
        if (this.isSoundEffectsMuted || !this.canPlaySound('ambient')) return;
        // A pleasant, mystical chime sound for when upgrades appear
        zzfx(.3,.05,1200,.3,.2,.4,1,4.5,0,50,100,.1,.1,0,0,.2,.1,.7,.05,.3,0);
    }
} 