'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceAnalyzer } from '@/lib/voice';
import { loadFaceModels, detectEmotions } from '@/lib/face';
import type { EmotionSignals } from '@/lib/emotion';

interface MultimodalControlsProps {
  onSignals:       (signals: Partial<EmotionSignals>) => void;
  /** Ref to the <video> element rendered by the parent (right panel) */
  cameraVideoRef:  React.RefObject<HTMLVideoElement>;
  onCameraChange:  (on: boolean) => void;
  onMicChange?:    (on: boolean) => void;
  onMicLevel?:     (volume: number, pitch: number) => void;
  /** Called when speech recognition produces a final transcript */
  onTranscript?:   (text: string) => void;
}

// Safely get the SpeechRecognition constructor (cross-browser)
function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function MultimodalControls({
  onSignals,
  cameraVideoRef,
  onCameraChange,
  onMicChange,
  onMicLevel,
  onTranscript,
}: MultimodalControlsProps) {
  const [micOn,    setMicOn]    = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micErr,   setMicErr]   = useState('');
  const [camErr,   setCamErr]   = useState('');
  const [sttReady, setSttReady] = useState(false);

  const micStreamRef    = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef     = useRef<VoiceAnalyzer | null>(null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef  = useRef<SpeechRecognition | null>(null);

  // Keep onTranscript stable in a ref so the recognition handler doesn't go stale
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // ── Speech Recognition (STT) ─────────────────────────────────
  const startSTT = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous      = true;
    recognition.interimResults  = false;
    recognition.lang            = 'en-US'; // user can override via browser settings

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Take the most recent final result
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.trim();
        if (transcript) onTranscriptRef.current?.(transcript);
      }
    };

    // Auto-restart if it stops (happens on some browsers after silence)
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch { /* already stopped */ }
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is normal — don't log it
      if (e.error !== 'no-speech') console.warn('[STT]', e.error);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setSttReady(true);
    } catch {
      setSttReady(false);
    }
  }, []);

  const stopSTT = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setSttReady(false);
  }, []);

  // ── Mic ──────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    setMicErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      analyzerRef.current  = new VoiceAnalyzer();
      await analyzerRef.current.init(stream);
      setMicOn(true);
      onMicChange?.(true);
      // Start speech-to-text if supported
      if (getSpeechRecognition()) startSTT();
    } catch {
      setMicErr('Microphone access denied');
    }
  }, [onMicChange, startSTT]);

  const stopMic = useCallback(() => {
    stopSTT();
    analyzerRef.current?.destroy();
    analyzerRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicOn(false);
    onMicChange?.(false);
  }, [onMicChange, stopSTT]);

  // ── Camera ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamErr('');
    try {
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
      setCameraOn(true);
      onCameraChange(true);
    } catch {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      setCamErr('Camera access denied');
    }
  }, [cameraVideoRef, onCameraChange]);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraOn(false);
    onCameraChange(false);
  }, [cameraVideoRef, onCameraChange]);

  // ── Polling loop ─────────────────────────────────────────────
  useEffect(() => {
    if (!micOn && !cameraOn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(async () => {
      const signals: Partial<EmotionSignals> = {};

      if (micOn && analyzerRef.current) {
        const v = analyzerRef.current.analyze();
        signals.voicePitch  = v.pitch;
        signals.voiceVolume = v.volume;
        onMicLevel?.(v.volume, v.pitch);
      }

      if (cameraOn && cameraVideoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width  = cameraVideoRef.current.videoWidth;
        canvas.height = cameraVideoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(cameraVideoRef.current, 0, 0);
        const face = await detectEmotions(canvas);
        signals.faceAnger     = face.angry;
        signals.faceSad       = face.sad;
        signals.faceHappy     = face.happy;
        signals.faceSurprised = face.surprised;
        signals.faceDisgusted = face.disgusted;
        signals.faceFearful   = face.fearful;
        signals.faceNeutral   = face.neutral;
        signals.eyeOpenness   = face.eyeOpenness;
        signals.browRaise     = face.browRaise;
        signals.mouthOpen     = face.mouthOpen;
        signals.faceAvailable = face.available;
      }

      if (Object.keys(signals).length > 0) onSignals(signals);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [micOn, cameraOn, onSignals, onMicLevel, cameraVideoRef]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMic();
      stopCamera();
    };
  }, [stopMic, stopCamera]);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 14px',
    background: active ? 'rgba(200,145,90,0.15)' : 'var(--color-surface)',
    border: `1px solid ${active ? 'rgba(200,145,90,0.4)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    color: active ? 'var(--color-primary)' : 'var(--color-muted)',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  const hasStt = typeof window !== 'undefined' && !!getSpeechRecognition();

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mic toggle */}
        <button style={btnStyle(micOn)} onClick={micOn ? stopMic : startMic}>
          <span style={{ fontSize: 15 }}>{micOn ? '🎙' : '🎤'}</span>
          {micOn ? 'Mic on' : 'Mic off'}
          {micOn && hasStt && sttReady && (
            <span style={{ fontSize: 10, color: 'var(--color-success)', marginLeft: 2 }}>STT</span>
          )}
          {micOn && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-success)',
              animation: 'mmcPulse 1.5s ease-in-out infinite',
            }} />
          )}
        </button>

        {/* Camera toggle */}
        <button style={btnStyle(cameraOn)} onClick={cameraOn ? stopCamera : startCamera}>
          <span style={{ fontSize: 15 }}>📷</span>
          {cameraOn ? 'Camera on' : 'Camera off'}
          {cameraOn && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-success)',
              animation: 'mmcPulse 1.5s ease-in-out infinite',
            }} />
          )}
        </button>
      </div>

      {micErr && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{micErr}</p>}
      {camErr && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{camErr}</p>}

      <style>{`
        @keyframes mmcPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
