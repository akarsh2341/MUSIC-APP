import { Bluetooth, Check, Moon, Music, Palette, RotateCcw, SlidersHorizontal, Sun, Trash2, Upload } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ACCENTS } from '../config';
import { useLibrary } from '../context/LibraryContext';
import { useUI } from '../context/UIContext';
import { EQ_LABELS, EQ_PRESETS, EQ_RANGE, resetEq, setEqBand, setEqEnabled, setEqPreset, useEqualizer } from '../lib/equalizer';
import { getPauseOnDisconnect, isNative, requestNotificationAccess, setPauseOnDisconnect } from '../lib/mediaSession';
import { toast } from '../lib/toast';
import { cn, pluralize } from '../lib/utils';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card mb-5 p-5" aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold">
        <span className="text-brand">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/10 py-3 first:border-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function BluetoothSection() {
  const [pauseOnDisconnect, setPause] = useState(getPauseOnDisconnect);
  const enableNotifications = async () => {
    const res = await requestNotificationAccess();
    toast(res === 'granted' ? 'Notification controls enabled' : res === 'denied' ? 'Allow notifications for VibePlay in system settings' : 'Not needed on this device');
  };
  return (
    <Section icon={<Bluetooth className="h-5 w-5" />} title="Bluetooth & headset">
      <Row title="Headset and Bluetooth buttons" hint={isNative ? 'Play, pause, next and previous from Bluetooth headphones, earbuds, car stereos and watches are active. Playback continues with the screen off.' : 'Media keys and headset buttons control playback in this browser. Install the Android app for full Bluetooth support.'}>
        <span className="chip" aria-label="Active">Active</span>
      </Row>
      <Row title="Pause when headphones disconnect" hint="Stops the music if your Bluetooth device or headphones switch off or unplug.">
        <button
          role="switch"
          aria-checked={pauseOnDisconnect}
          aria-label="Pause when headphones disconnect"
          onClick={() => {
            const next = !pauseOnDisconnect;
            setPause(next);
            setPauseOnDisconnect(next);
          }}
          className={cn('relative h-7 w-12 rounded-full transition', pauseOnDisconnect ? 'bg-brand' : 'bg-elevated border border-line/20')}
        >
          <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', pauseOnDisconnect ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </Row>
      {isNative && (
        <Row title="Notification controls" hint="Show play, pause, next and previous in the notification shade and on the lock screen.">
          <button className="btn-ghost" onClick={enableNotifications}>
            Enable
          </button>
        </Row>
      )}
    </Section>
  );
}

function EqualizerSection() {
  const eq = useEqualizer();
  const presets = [...Object.keys(EQ_PRESETS), ...(eq.preset === 'Custom' ? ['Custom'] : [])];
  return (
    <Section icon={<SlidersHorizontal className="h-5 w-5" />} title="Equalizer">
      <Row title="Equalizer" hint="Shape the sound with 10 frequency bands.">
        <button
          role="switch"
          aria-checked={eq.enabled}
          aria-label="Equalizer on or off"
          onClick={() => setEqEnabled(!eq.enabled)}
          className={cn('relative h-7 w-12 rounded-full transition', eq.enabled ? 'bg-brand' : 'bg-elevated border border-line/20')}
        >
          <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', eq.enabled ? 'left-[22px]' : 'left-0.5')} />
        </button>
      </Row>
      {eq.enabled && eq.unavailable && (
        <p className="mb-3 rounded-lg bg-elevated px-3 py-2 text-xs text-muted" role="status">
          The server for this online track blocks audio processing, so the equalizer can't change it. It works on music you upload yourself.
        </p>
      )}
      <div className={cn('transition', !eq.enabled && 'opacity-50')}>
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Equalizer preset">
          {presets.map((name) => (
            <button
              key={name}
              role="radio"
              aria-checked={eq.preset === name}
              onClick={() => name !== 'Custom' && setEqPreset(name)}
              className={cn('rounded-full border px-3 py-1 text-sm font-semibold transition', eq.preset === name ? 'border-transparent bg-ink text-bg' : 'border-line/15 text-muted hover:text-ink')}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-1 overflow-x-auto pb-1" role="group" aria-label="Frequency bands">
          {EQ_LABELS.map((label, i) => (
            <div key={label} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[10px] text-muted">{eq.gains[i] > 0 ? '+' : ''}{eq.gains[i]}</span>
              <div className="relative h-36 w-8">
                <input
                  type="range"
                  min={-EQ_RANGE}
                  max={EQ_RANGE}
                  step={0.5}
                  value={eq.gains[i]}
                  aria-label={`${label} Hz`}
                  aria-valuetext={`${eq.gains[i]} decibels`}
                  onChange={(e) => setEqBand(i, Number(e.target.value))}
                  onDoubleClick={() => setEqBand(i, 0)}
                  className="absolute left-1/2 top-1/2 h-6 w-36 -translate-x-1/2 -translate-y-1/2 -rotate-90 cursor-pointer"
                  style={{ accentColor: 'rgb(var(--brand))' }}
                />
              </div>
              <span className="text-[11px] font-semibold text-muted">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted">Double-tap a slider to zero it. Range ±{EQ_RANGE} dB.</p>
          <button className="btn-ghost" onClick={resetEq}>
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, accent, setAccent, pickFiles, confirm } = useUI();
  const { localCount, songs, history, recentSearches, clearHistory, clearRecentSearches, removeLocalSong, resetAll, playlists, likedIds } = useLibrary();

  const removeAllLocal = () =>
    confirm({
      title: 'Delete all uploaded music?',
      message: `${pluralize(localCount, 'file')} will be removed from VibePlay. The original files on your device are not touched.`,
      confirmLabel: 'Delete uploads',
      danger: true,
      onConfirm: () => {
        songs.filter((s) => s.source === 'local').forEach((s) => removeLocalSong(s.id));
        toast('Uploaded music deleted');
      },
    });

  const reset = () =>
    confirm({
      title: 'Reset VibePlay?',
      message: 'This permanently deletes your playlists, liked songs, history, uploaded music and saved searches on this device. Theme and volume are kept.',
      confirmLabel: 'Reset everything',
      danger: true,
      onConfirm: () => void resetAll(),
    });

  return (
    <div className="max-w-3xl pb-8 pt-1">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight md:text-4xl">Settings</h1>

      <Section icon={<Palette className="h-5 w-5" />} title="Appearance">
        <Row title="Theme" hint="Dark is the default. Your choice is remembered.">
          <div className="inline-flex rounded-full border border-line/15 bg-elevated p-1" role="radiogroup" aria-label="Theme">
            {(['dark', 'light'] as const).map((t) => (
              <button key={t} role="radio" aria-checked={theme === t} onClick={() => setTheme(t)} className={cn('flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition', theme === t ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}>
                {t === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </Row>
        <Row title="Accent colour" hint="Customise the brand colours used throughout the app.">
          <div className="flex gap-2" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                role="radio"
                aria-checked={accent === a.id}
                aria-label={a.label}
                title={a.label}
                onClick={() => setAccent(a.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition hover:scale-110 aria-checked:ring-2 aria-checked:ring-ink"
                style={{ background: `linear-gradient(135deg, rgb(${a.brand}), rgb(${a.accent}))` }}
              >
                {accent === a.id && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <EqualizerSection />

      <BluetoothSection />

      <Section icon={<Music className="h-5 w-5" />} title="Your music">
        <Row title="Add your own music" hint="MP3, M4A, WAV, OGG, FLAC and more. Files stay on this device (IndexedDB).">
          <button className="btn-primary" onClick={pickFiles}>
            <Upload className="h-4 w-4" /> Choose files
          </button>
        </Row>
        <Row title="Uploaded files" hint={`${pluralize(localCount, 'file')} stored locally`}>
          <button className="btn-ghost" disabled={!localCount} onClick={removeAllLocal}>
            <Trash2 className="h-4 w-4" /> Delete uploads
          </button>
        </Row>
        <Row title="Listening history" hint={`${pluralize(history.length, 'play')} recorded`}>
          <button className="btn-ghost" disabled={!history.length} onClick={clearHistory}>
            Clear history
          </button>
        </Row>
        <Row title="Recent searches" hint={`${pluralize(recentSearches.length, 'saved search', 'saved searches')}`}>
          <button
            className="btn-ghost"
            disabled={!recentSearches.length}
            onClick={() => {
              clearRecentSearches();
              toast('Recent searches cleared');
            }}
          >
            Clear searches
          </button>
        </Row>
        <Row title="Reset everything" hint={`${pluralize(playlists.length, 'playlist')} · ${pluralize(likedIds.length, 'liked song')}`}>
          <button className="btn-danger" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset library
          </button>
        </Row>
      </Section>
    </div>
  );
}
