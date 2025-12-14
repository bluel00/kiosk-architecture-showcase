# IPC 채널 및 계약 정의

렌더러는 타입화된 IPC 채널만 사용하며, 하드웨어 세부 구현은 제외합니다. 아래 표는 주요 채널과 페이로드 예시를 요약합니다.

| Direction | Channel | Request Payload | Response/Event Payload | Notes |
| --- | --- | --- | --- | --- |
| Renderer → Main | `session:start` | `{ locale: string; kioskId: string; }` | `{ sessionId: string; expiresAt: number; }` | 세션 초기화 요청 |
| Renderer → Main | `capture:request` | `{ sessionId: string; preset: 'single' | 'burst'; }` | `{ requestId: string; }` | 촬영 트리거. 실제 카메라 프로토콜은 포함하지 않음 |
| Main → Renderer | `capture:result` | `{ requestId: string; assetUri: string; thumbUri?: string; }` | — | 촬영 결과 전달 |
| Renderer → Main | `asset:save` | `{ sessionId: string; assetUri: string; variant: 'print' | 'digital'; }` | `{ saved: boolean; referenceId?: string; }` | 저장/배포 요청 |
| Renderer → Main | `session:cancel` | `{ sessionId: string; reason?: string; }` | `{ status: 'cancelled'; }` | 세션 취소 |

## 타입 스텁 (Preload 노출 예시)
```ts
// 타입 정의 예시: 실제 IPC 구현 또는 빌드 설정은 포함하지 않습니다.
export interface RendererToMain {
  'session:start': (input: { locale: string; kioskId: string }) => Promise<{ sessionId: string; expiresAt: number }>;
  'capture:request': (input: { sessionId: string; preset: 'single' | 'burst' }) => Promise<{ requestId: string }>;
  'asset:save': (input: { sessionId: string; assetUri: string; variant: 'print' | 'digital' }) => Promise<{ saved: boolean; referenceId?: string }>;
  'session:cancel': (input: { sessionId: string; reason?: string }) => Promise<{ status: 'cancelled' }>;
}

export interface MainToRenderer {
  'session:update': (payload: { sessionId: string; state: string }) => void;
  'capture:result': (payload: { requestId: string; assetUri: string; thumbUri?: string }) => void;
  'hardware:status': (payload: { device: 'camera' | 'light' | 'printer'; state: 'ready' | 'busy' | 'error'; detail?: string }) => void;
}

// Preload 브리지 예시
export interface KioskBridge {
  invoke<T extends keyof RendererToMain>(channel: T, payload: Parameters<RendererToMain[T]>[0]): ReturnType<RendererToMain[T]>;
  subscribe<T extends keyof MainToRenderer>(channel: T, listener: MainToRenderer[T]): () => void;
}
```

## 보안 가이드
- 허용된 채널만 `contextBridge`를 통해 노출합니다.
- 파일/네트워크 접근은 메인 프로세스에서만 수행하고, 렌더러에는 결과만 전달합니다.
- 민감 데이터나 실제 엔드포인트 URL은 포함하지 않습니다.
