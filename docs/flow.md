# 사용자 플로우 및 상태 전이

렌더러는 상태 머신을 중심으로 사용자 경험을 관리합니다. 하드웨어 의존성은 존재하지 않으며, IPC 응답에 따라 상태만 변경됩니다.

## 핵심 상태
1. **idle**: 세션이 없는 초기 상태.
2. **sessionPreparing**: 세션 메타데이터를 수집하고, 메인 프로세스에서 준비 신호를 기다립니다.
3. **guiding**: 촬영 안내 UI를 표시하고, 사용자의 준비 완료를 받습니다.
4. **capturing**: 촬영 트리거 요청을 IPC로 전송한 뒤 결과를 기다립니다.
5. **reviewing**: 촬영 결과를 확인/재촬영 여부를 선택합니다.
6. **publishing**: 최종 이미지를 저장/배포하도록 요청합니다.
7. **completed**: 세션 종료 메시지를 표시하고 idle로 복귀합니다.

## 전이 규칙 (예시)
- `idle → sessionPreparing`: `session:start` 요청을 전송하고, `session:update` 응답을 수신하면 전이합니다.
- `guiding → capturing`: 사용자가 준비 버튼을 누르면 `capture:request`를 전송합니다.
- `capturing → reviewing`: `capture:result` 수신 시 결과 데이터를 렌더러 상태로 반영합니다.
- `reviewing → guiding`: 재촬영을 선택하면 이전 단계로 롤백합니다.
- `publishing → completed`: `asset:save` 성공 응답을 받으면 완료 메시지를 표시합니다.

## 예외 처리 전략
- **타임아웃**: 특정 상태에서 응답이 없으면 `error` 하위 상태로 분기하고, UI에 재시도/홈으로 이동 옵션을 제공합니다.
- **취소**: 사용자가 흐름을 중단하면 `session:cancel`을 전송하고 idle로 복귀합니다.
- **상태 동기화**: 메인 프로세스가 `session:update` 이벤트로 강제 전환을 요청할 수 있으며, 렌더러는 이를 우선시합니다.

## UI 구성 시나리오
- 상태별 화면 컴포넌트를 분리합니다. 예: `IdleView`, `GuideView`, `CaptureView`, `ReviewView`, `CompleteView`.
- IPC 요청/응답은 커스텀 훅(예: `useCaptureFlow`)으로 캡슐화하여, 화면 전환 로직을 단순화합니다.
