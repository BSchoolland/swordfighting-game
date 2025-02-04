import { SoundManager } from './SoundManager';

declare global {
    interface Window {
        CrazyGames: {
            SDK: {
                init: () => Promise<void>;
                game: {
                    gameplayStart: () => void;
                    gameplayStop: () => void;
                };
                ad: {
                    requestAd: (type: string, callbacks: {
                        adStarted?: () => void;
                        adFinished?: () => void;
                        adError?: (error: any) => void;
                    }) => void;
                };
            };
        };
    }
}

export class AdManager {
    private static instance: AdManager;
    private soundManager: SoundManager;
    private isAdPlaying: boolean = false;
    private isInitialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
    private wasMusicEnabled: boolean = false;

    private constructor() {
        this.soundManager = SoundManager.getInstance();
        // Initialize SDK immediately
        this.initializationPromise = this.initializeSDK();
    }

    public static getInstance(): AdManager {
        if (!AdManager.instance) {
            AdManager.instance = new AdManager();
        }
        return AdManager.instance;
    }

    private async initializeSDK(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            if (window.CrazyGames?.SDK?.init) {
                await window.CrazyGames.SDK.init();
                this.isInitialized = true;
                console.log('CrazyGames SDK initialized successfully');
            } else {
                console.warn('CrazyGames SDK not found');
            }
        } catch (error) {
            console.error('Failed to initialize CrazyGames SDK:', error);
            this.isInitialized = false;
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }

    public async notifyGameplayStart(): Promise<void> {
        await this.ensureInitialized();
        if (this.isInitialized && window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.gameplayStart();
        }
    }

    public async notifyGameplayStop(): Promise<void> {
        await this.ensureInitialized();
        if (this.isInitialized && window.CrazyGames?.SDK?.game) {
            window.CrazyGames.SDK.game.gameplayStop();
        }
    }

    public async showAd(): Promise<void> {
        await this.ensureInitialized();
        
        return new Promise<void>((resolve) => {
            if (!this.isInitialized || !window.CrazyGames?.SDK?.ad || this.isAdPlaying) {
                resolve();
                return;
            }

            this.isAdPlaying = true;

            window.CrazyGames.SDK.ad.requestAd('midgame', {
                adStarted: () => {
                    // Store current music state and pause music
                    this.wasMusicEnabled = this.soundManager.isMusicEnabled();
                    this.soundManager.setMusicEnabled(false);
                },
                adFinished: () => {
                    // Restore previous music state
                    this.soundManager.setMusicEnabled(this.wasMusicEnabled);
                    this.isAdPlaying = false;
                    resolve();
                },
                adError: (error) => {
                    console.error('Ad error:', error);
                    // Restore previous music state
                    this.soundManager.setMusicEnabled(this.wasMusicEnabled);
                    this.isAdPlaying = false;
                    resolve(); // Resolve anyway to not block the game
                }
            });
        });
    }
} 