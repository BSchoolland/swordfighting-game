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
    private isInFallbackMode: boolean = false;
    private initializationError: string | null = null;

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
            // Check if we're in a supported environment
            if (typeof window === 'undefined') {
                throw new Error('Window object not found - not in browser environment');
            }

            // Check if SDK script is loaded
            if (!window.CrazyGames?.SDK?.init) {
                throw new Error('CrazyGames SDK not found - script may not be loaded');
            }

            // Try to initialize the SDK
            try {
                await window.CrazyGames.SDK.init();
                this.isInitialized = true;
                this.isInFallbackMode = false;
                this.initializationError = null;
                console.log('CrazyGames SDK initialized successfully');
            } catch (e: any) {
                // Check specifically for sdkDisabled error
                if (e?.code === 'sdkDisabled') {
                    throw new Error('CrazyGames SDK is disabled on this domain - game must be hosted on CrazyGames.com');
                }
                throw e; // Re-throw other initialization errors
            }
        } catch (error) {
            this.isInitialized = false;
            this.isInFallbackMode = true;
            this.initializationError = error instanceof Error ? error.message : 'Unknown error initializing CrazyGames SDK';
            
            // Log different messages based on the error
            if (this.initializationError.includes('disabled on this domain')) {
                console.warn('Running in development mode:', this.initializationError);
            } else {
                console.warn('Falling back to offline mode:', this.initializationError);
            }
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }

    public getInitializationStatus(): { initialized: boolean; fallbackMode: boolean; error: string | null } {
        return {
            initialized: this.isInitialized,
            fallbackMode: this.isInFallbackMode,
            error: this.initializationError
        };
    }

    public async notifyGameplayStart(): Promise<void> {
        try {
            await this.ensureInitialized();
            // Only attempt to call SDK methods if we're properly initialized and not in fallback mode
            if (!this.isInFallbackMode && this.isInitialized && window.CrazyGames?.SDK?.game) {
                try {
                    await window.CrazyGames.SDK.game.gameplayStart();
                } catch (error: unknown) {
                    console.warn('Error notifying gameplay start:', error);
                    // Mark as fallback mode if we get an SDK disabled error
                    if (error && typeof error === 'object' && 'code' in error && error.code === 'sdkDisabled') {
                        this.isInFallbackMode = true;
                        this.initializationError = 'CrazyGames SDK is disabled on this domain';
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to notify gameplay start:', error);
            // Don't throw - we want the game to continue even if notification fails
        }
    }

    public async notifyGameplayStop(): Promise<void> {
        try {
            await this.ensureInitialized();
            // Only attempt to call SDK methods if we're properly initialized and not in fallback mode
            if (!this.isInFallbackMode && this.isInitialized && window.CrazyGames?.SDK?.game) {
                try {
                    await window.CrazyGames.SDK.game.gameplayStop();
                } catch (error: unknown) {
                    console.warn('Error notifying gameplay stop:', error);
                    // Mark as fallback mode if we get an SDK disabled error
                    if (error && typeof error === 'object' && 'code' in error && error.code === 'sdkDisabled') {
                        this.isInFallbackMode = true;
                        this.initializationError = 'CrazyGames SDK is disabled on this domain';
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to notify gameplay stop:', error);
            // Don't throw - we want the game to continue even if notification fails
        }
    }

    public async showAd(): Promise<void> {
        return;
        try {
            await this.ensureInitialized();
            
            return new Promise<void>((resolve) => {
                // Skip ad if in fallback mode, not initialized, SDK not available, or ad already playing
                if (this.isInFallbackMode || !this.isInitialized || !window.CrazyGames?.SDK?.ad || this.isAdPlaying) {
                    console.log(this.isInFallbackMode ? 'Skipping ad in fallback mode' : 'Skipping ad due to unavailability');
                    resolve();
                    return;
                }

                this.isAdPlaying = true;
                let adTimeoutId: number | null = null;

                // Set a timeout to resolve if ad takes too long
                adTimeoutId = setTimeout(() => {
                    console.warn('Ad request timed out after 10 seconds');
                    if (this.isAdPlaying) {
                        this.soundManager.setMusicEnabled(this.wasMusicEnabled);
                        this.isAdPlaying = false;
                        resolve();
                    }
                }, 10000);

                const cleanupAndResolve = () => {
                    if (adTimeoutId) clearTimeout(adTimeoutId);
                    this.soundManager.setMusicEnabled(this.wasMusicEnabled);
                    this.isAdPlaying = false;
                    resolve();
                };

                try {
                    // Wrap the ad request in a Promise to handle both callback and promise-based errors
                    new Promise<void>((adResolve, adReject) => {
                        try {
                            window.CrazyGames.SDK.ad.requestAd('midgame', {
                                adStarted: () => {
                                    // Store current music state and pause music
                                    this.wasMusicEnabled = this.soundManager.isMusicEnabled();
                                    this.soundManager.setMusicEnabled(false);
                                },
                                adFinished: () => {
                                    adResolve();
                                },
                                adError: (error: unknown) => {
                                    adReject(error);
                                }
                            });
                        } catch (error) {
                            adReject(error);
                        }
                    }).catch((error: unknown) => {
                        console.warn('Ad error:', error);
                        // Mark as fallback mode if we get an SDK disabled error
                        if (error && typeof error === 'object' && 'code' in error && error.code === 'sdkDisabled') {
                            this.isInFallbackMode = true;
                            this.initializationError = 'CrazyGames SDK is disabled on this domain';
                        }
                    }).finally(() => {
                        cleanupAndResolve();
                    });
                } catch (error) {
                    console.error('Error requesting ad:', error);
                    cleanupAndResolve();
                }
            });
        } catch (error) {
            console.warn('Failed to show ad:', error);
            // Don't throw - we want the game to continue even if ad fails
            return Promise.resolve();
        }
    }
} 