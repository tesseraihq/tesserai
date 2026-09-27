import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Appearance = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private media = window.matchMedia('(prefers-color-scheme: dark)');
  private current: Appearance = 'system';

  async init() {
    const { value } = await Preferences.get({ key: 'appearance' });
    this.current = (value as Appearance) ?? 'system';
    this.apply();
    this.media.addEventListener('change', () => this.apply());
  }

  async set(appearance: Appearance) {
    this.current = appearance;
    await Preferences.set({ key: 'appearance', value: appearance });
    this.apply();
  }

  private apply() {
    const dark = this.current === 'dark' || (this.current === 'system' && this.media.matches);
    document.documentElement.classList.toggle('ion-palette-dark', dark);
  }
}
