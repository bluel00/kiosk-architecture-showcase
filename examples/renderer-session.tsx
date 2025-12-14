// 렌더러 예시 코드 (실행 불가 스텁)
// 실제 빌드 도구나 하드웨어 코드는 포함하지 않습니다.
import React, { useEffect, useMemo, useState } from 'react';

// preload에서 노출한다고 가정한 브리지 타입
interface RendererToMain {
  'session:start': (input: { locale: string; kioskId: string }) => Promise<{ sessionId: string; expiresAt: number }>;
  'capture:request': (input: { sessionId: string; preset: 'single' | 'burst' }) => Promise<{ requestId: string }>;
  'asset:save': (input: { sessionId: string; assetUri: string; variant: 'print' | 'digital' }) => Promise<{ saved: boolean; referenceId?: string }>;
  'session:cancel': (input: { sessionId: string; reason?: string }) => Promise<{ status: 'cancelled' }>;
}

interface MainToRenderer {
  'capture:result': (payload: { requestId: string; assetUri: string; thumbUri?: string }) => void;
  'session:update': (payload: { sessionId: string; state: string }) => void;
}

interface KioskBridge {
  invoke<T extends keyof RendererToMain>(channel: T, payload: Parameters<RendererToMain[T]>[0]): ReturnType<RendererToMain[T]>;
  subscribe<T extends keyof MainToRenderer>(channel: T, listener: MainToRenderer[T]): () => void;
}

declare global {
  interface Window {
    kioskBridge?: KioskBridge;
  }
}

type FlowState = 'idle' | 'sessionPreparing' | 'guiding' | 'capturing' | 'reviewing' | 'publishing' | 'completed';

export const RendererSessionDemo: React.FC = () => {
  const [state, setState] = useState<FlowState>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastCaptureUri, setLastCaptureUri] = useState<string | null>(null);

  const bridge = useMemo(() => window.kioskBridge, []);

  useEffect(() => {
    if (!bridge) return;

    const unsubResult = bridge.subscribe('capture:result', payload => {
      setLastCaptureUri(payload.assetUri);
      setState('reviewing');
    });

    const unsubSession = bridge.subscribe('session:update', payload => {
      setState(payload.state as FlowState);
      setSessionId(payload.sessionId);
    });

    return () => {
      unsubResult?.();
      unsubSession?.();
    };
  }, [bridge]);

  const startSession = async () => {
    if (!bridge) return;
    setState('sessionPreparing');
    const response = await bridge.invoke('session:start', { locale: 'ko-KR', kioskId: 'demo-kiosk' });
    setSessionId(response.sessionId);
    setState('guiding');
  };

  const triggerCapture = async () => {
    if (!bridge || !sessionId) return;
    setState('capturing');
    await bridge.invoke('capture:request', { sessionId, preset: 'single' });
  };

  const publishAsset = async () => {
    if (!bridge || !sessionId || !lastCaptureUri) return;
    setState('publishing');
    await bridge.invoke('asset:save', { sessionId, assetUri: lastCaptureUri, variant: 'digital' });
    setState('completed');
  };

  return (
    <div>
      <h1>Renderer Flow Demo (non-runnable)</h1>
      <p>현재 상태: {state}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={startSession} disabled={state !== 'idle'}>세션 시작</button>
        <button onClick={triggerCapture} disabled={state !== 'guiding'}>촬영</button>
        <button onClick={publishAsset} disabled={state !== 'reviewing'}>발행</button>
      </div>
      {lastCaptureUri && <p>최근 촬영 결과: {lastCaptureUri}</p>}
      {!bridge && <p>⚠️ preload 브리지가 주입되지 않은 상태입니다. 이 코드는 실행 예시가 아닙니다.</p>}
    </div>
  );
};
