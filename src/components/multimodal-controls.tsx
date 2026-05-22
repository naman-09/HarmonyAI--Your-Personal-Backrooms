'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceAnalyzer } from '@/lib/voice';
import { loadFaceModels, detectEmotions } from '@/lib/face';
import type { EmotionSignals } from '@/lib/emotion';

interface MultimodalControlsProps {
  onSignals: (signals: Partial<EmotionSignals>) => void;
}

export function MultimodalControls({ onSignals }: MultimodalControlsProps) {
  const [micOn,    setMicOn]    = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micErr,   setMicErr]   = useState('');
  const [camErr,   setCamErr]   = useState('');

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<VoiceAnalyzer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Mic ──────────────────────────────────────────────────────
  const startMic = useCallback(async () => {
    setMicErr('');
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      analyzerRef.current = new VoiceAnalyzer();
      await analyzerRef.current.init(stream);
      setMicOn(true);
    } catch {
      setMicErr('Microphone access denied');
    }
  }, []);

  const stopMic = useCallback(() => {
    analyzerRef.current?.destroy();
    analyzerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicOn(false);
  }, []);

  // ── Camera ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamErr('');
    try {
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCamErr('Camera access denied');
    }
  }, []);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraOn(false);
  }, []);

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
      }

      if (cameraOn && videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const face = await detectEmotions(canvas);
        signals.faceAnger     = face.angry;
        signals.faceAvailable = face.available;
      }

      if (Object.keys(signals).length > 0) {
        onSignals(signals);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [micOn, cameraOn, onSignals]);

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
    background: active ? 'rgba(107,143,255,0.15)' : 'var(--color-surface)',
    border: `1px solid ${active ? 'rgba(107,143,255,0.4)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    color: active ? 'var(--color-primary)' : 'var(--color-muted)',
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Mic toggle */}
        <button style={btnStyle(micOn)} onClick={micOn ? stopMic : startMic}>
          <span style={{ fontSize: 15 }}>{micOn ? '🎙' : '🎤'}</span>
          {micOn ? 'Mic on' : 'Mic off'}
          {micOn && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-success)',
              animation: 'pulse 1.5s ease-in-out infinite',
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
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          )}
        </button>
      </div>

      {/* Errors */}
      {micErr && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{micErr}</p>}
      {camErr && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 6 }}>{camErr}</p>}

      {/* Hidden video element for face detection */}
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ display: 'none' }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
