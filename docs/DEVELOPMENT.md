# 개발 환경 가이드

이 문서는 Board Game Platform의 로컬 개발 환경을 설정하는 방법을 설명합니다.

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [프로젝트 설정](#프로젝트-설정)
3. [개발 서버 실행](#개발-서버-실행)
4. [개발 워크플로우](#개발-워크플로우)
5. [코드 구조 이해](#코드-구조-이해)
6. [디버깅](#디버깅)
7. [자주 발생하는 문제](#자주-발생하는-문제)

---

## 사전 요구사항

### 필수 설치

| 도구 | 버전 | 확인 명령어 |
|------|------|------------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

### 선택 사항 (로컬 개발 시)

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 20+ | 프론트엔드 개발 |
| pnpm | 8+ | 패키지 매니저 |
| Python | 3.11+ | 백엔드 개발 |
| Poetry/pip | - | Python 패키지 매니저 |

---

## 프로젝트 설정

### 1. 저장소 클론

```bash
git clone https://github.com/shoney921/board_game.git
cd board-game-platform
```

### 2. 환경변수 설정

```bash
# 개발용 환경변수 파일 복사
cp .env.example .env

# (선택) 프론트엔드 로컬 개발 시
cp apps/web/.env.example apps/web/.env.local
```

### 3. 환경변수 확인

`.env` 파일 내용:
```bash
# PostgreSQL
POSTGRES_USER=boardgame
POSTGRES_PASSWORD=boardgame_secret
POSTGRES_DB=boardgame_dev

# Security
SECRET_KEY=dev-secret-key

# CORS
CORS_ORIGINS=http://localhost:3003
```

---

## 개발 서버 실행

### 방법 1: Docker Compose (권장)

모든 서비스를 한 번에 실행합니다.

```bash
# 개발 환경 실행
docker-compose -f docker-compose.dev.yml up --build

# 백그라운드 실행
docker-compose -f docker-compose.dev.yml up --build -d

# 로그 확인 (백그라운드 실행 시)
docker-compose -f docker-compose.dev.yml logs -f
```

**접속 URL:**
| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3003 | Next.js 개발 서버 |
| Backend API | http://localhost:8003 | FastAPI 서버 |
| API 문서 | http://localhost:8003/docs | Swagger UI |
| PostgreSQL | localhost:5435 | DB 직접 접속 |
| Redis | localhost:6382 | Redis CLI 접속 |

### 방법 2: 로컬 개발 (Hot Reload 최적화)

Docker로 DB만 실행하고, 프론트엔드/백엔드는 로컬에서 실행합니다.

#### DB만 Docker로 실행

```bash
# PostgreSQL + Redis만 실행
docker-compose -f docker-compose.dev.yml up postgres redis -d
```

#### 백엔드 로컬 실행

```bash
cd apps/api

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
export DATABASE_URL="postgresql://boardgame:boardgame_secret@localhost:5435/boardgame_dev"
export REDIS_URL="redis://localhost:6382/0"
export SECRET_KEY="dev-secret-key"
export CORS_ORIGINS="http://localhost:3000"

# 서버 실행
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload
```

#### 프론트엔드 로컬 실행

```bash
cd apps/web

# pnpm 설치 (없는 경우)
npm install -g pnpm

# 의존성 설치
pnpm install

# 환경변수 설정 (.env.local)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_WS_URL=http://localhost:8000" >> .env.local

# 개발 서버 실행
pnpm dev
```

---

## 개발 워크플로우

### 일반적인 개발 흐름

```
1. 기능 브랜치 생성
   git checkout -b feature/my-feature

2. 코드 수정
   - 백엔드: apps/api/app/
   - 프론트엔드: apps/web/

3. 테스트 (Hot Reload로 자동 반영)
   - 브라우저에서 확인
   - API 문서에서 테스트

4. 커밋 & 푸시
   git add .
   git commit -m "feat: 기능 설명"
   git push origin feature/my-feature

5. PR 생성 & 리뷰

6. 머지 후 배포
   docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

### 데이터베이스 마이그레이션

```bash
# 새 마이그레이션 생성
docker-compose -f docker-compose.dev.yml exec api alembic revision --autogenerate -m "설명"

# 마이그레이션 적용
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head

# 마이그레이션 롤백
docker-compose -f docker-compose.dev.yml exec api alembic downgrade -1
```

### 새로운 API 엔드포인트 추가

1. **스키마 정의** (`apps/api/app/schemas/`)
```python
# schemas/example.py
from pydantic import BaseModel

class ExampleCreate(BaseModel):
    name: str
    description: str | None = None

class ExampleResponse(BaseModel):
    id: int
    name: str
```

2. **모델 정의** (`apps/api/app/models/`)
```python
# models/example.py
from sqlalchemy import Column, Integer, String
from app.db.database import Base

class Example(Base):
    __tablename__ = "examples"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
```

3. **API 라우터** (`apps/api/app/api/`)
```python
# api/examples.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_session

router = APIRouter(prefix="/api/examples", tags=["examples"])

@router.post("/")
async def create_example(
    data: ExampleCreate,
    session: AsyncSession = Depends(get_session)
):
    # 로직
    pass
```

4. **라우터 등록** (`apps/api/app/main.py`)
```python
from app.api.examples import router as examples_router
app.include_router(examples_router)
```

### 새로운 Socket 이벤트 추가

1. **백엔드 이벤트 핸들러** (`apps/api/app/sockets/manager.py`)
```python
@sio.event
async def my_event(sid, data):
    """
    커스텀 이벤트 핸들러
    Expected data: { key: value }
    """
    user_data = manager.get_user_data(sid)
    if not user_data:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return

    # 로직 처리
    result = process_data(data)

    # 응답 전송
    await sio.emit("my_event_result", result, to=sid)
```

2. **프론트엔드 이벤트 리스너** (`apps/web/stores/socketStore.ts`)
```typescript
socket.on('my_event_result', (data) => {
  console.log('Result:', data)
  // 상태 업데이트
})
```

3. **이벤트 전송** (`apps/web/stores/` 또는 컴포넌트)
```typescript
const socket = getSocket()
socket.emit('my_event', { key: 'value' })
```

---

## 코드 구조 이해

### 백엔드 요청 흐름

```
HTTP 요청 → FastAPI Router → 서비스 로직 → DB/Redis → 응답

예: POST /api/rooms
1. api/rooms.py의 create_room() 호출
2. Room 모델 생성
3. PostgreSQL에 저장
4. RoomResponse 스키마로 응답
```

### 프론트엔드 상태 흐름

```
사용자 액션 → Store 메서드 → Socket/API 호출 → 이벤트 수신 → 상태 업데이트 → UI 렌더링

예: 게임 시작
1. 방장이 "게임 시작" 클릭
2. roomStore.startGame() 호출
3. socket.emit('start_game', data)
4. 서버가 'game_started', 'role_assigned' 이벤트 전송
5. socketStore 리스너가 gameStore 업데이트
6. GamePage 리렌더링
```

### Socket.IO 이벤트 목록

| 이벤트 (C→S) | 설명 | 데이터 |
|-------------|------|-------|
| `join_room` | 방 입장 | `{ room_id, user_id, username, display_name }` |
| `leave_room` | 방 퇴장 | `{ room_id, user_id }` |
| `start_game` | 게임 시작 | `{ room_id, game_type, game_id }` |
| `propose_team` | 팀 제안 | `{ game_id, team_members }` |
| `vote_team` | 팀 투표 | `{ game_id, approve }` |
| `vote_mission` | 미션 투표 | `{ game_id, success }` |
| `assassinate` | 암살 | `{ game_id, target_id }` |
| `rejoin_game` | 게임 재접속 | `{ room_id }` |

| 이벤트 (S→C) | 설명 | 데이터 |
|-------------|------|-------|
| `user_joined` | 유저 입장 알림 | `{ user_id, username, display_name }` |
| `user_left` | 유저 퇴장 알림 | `{ user_id }` |
| `host_changed` | 방장 변경 | `{ new_host_id }` |
| `game_started` | 게임 시작 | `{ room_id, game_type, game_id, game_state }` |
| `role_assigned` | 역할 배정 | `{ game_id, role, team, known_info }` |
| `game_state_update` | 상태 업데이트 | `{ game_id, state }` |
| `team_proposed` | 팀 제안됨 | `{ game_id, leader_id, proposed_team }` |
| `team_vote_result` | 팀 투표 결과 | `{ team_approved, votes, ... }` |
| `mission_result` | 미션 결과 | `{ result, fail_count, ... }` |
| `game_ended` | 게임 종료 | `{ winner_team, players, reason }` |

---

## 디버깅

### 백엔드 디버깅

```bash
# API 로그 확인
docker-compose -f docker-compose.dev.yml logs -f api

# 특정 이벤트 디버깅 (manager.py에 print 추가)
print(f"[event_name] data: {data}, user: {user_data}")

# Redis 데이터 확인
docker exec -it boardgame_redis_dev redis-cli
> KEYS *
> GET session:xxx
> HGETALL room:ABC123:users
```

### 프론트엔드 디버깅

```javascript
// 브라우저 콘솔에서 상태 확인
// Zustand DevTools 또는 직접 접근

// 소켓 이벤트 로깅 (socketStore.ts에 이미 있음)
socket.on('event_name', (data) => {
  console.log('Event received:', data)
})
```

### 네트워크 디버깅

1. 브라우저 개발자 도구 → Network 탭
2. WS 필터로 WebSocket 연결 확인
3. Messages에서 송수신 이벤트 확인

---

## 자주 발생하는 문제

### 1. Docker 컨테이너가 시작되지 않음

```bash
# 상태 확인
docker-compose -f docker-compose.dev.yml ps

# 로그 확인
docker-compose -f docker-compose.dev.yml logs api

# 컨테이너 재빌드
docker-compose -f docker-compose.dev.yml up --build --force-recreate
```

### 2. 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :3003
lsof -i :8003

# 프로세스 종료
kill -9 <PID>
```

### 3. DB 연결 실패

```bash
# PostgreSQL 상태 확인
docker-compose -f docker-compose.dev.yml exec postgres pg_isready

# 연결 테스트
docker-compose -f docker-compose.dev.yml exec postgres psql -U boardgame -d boardgame_dev -c "SELECT 1"
```

### 4. Hot Reload가 작동하지 않음

**프론트엔드:**
```bash
# node_modules 재설치
cd apps/web
rm -rf node_modules .next
pnpm install
```

**백엔드 (Docker):**
- 볼륨 마운트 확인: `docker-compose.dev.yml`의 volumes 설정
- 파일 변경 감지 문제 시: 컨테이너 재시작

### 5. WebSocket 연결 실패

```bash
# CORS 설정 확인
echo $CORS_ORIGINS

# 환경변수 확인 (프론트엔드)
cat apps/web/.env.local
# NEXT_PUBLIC_WS_URL=http://localhost:8003

# API 서버 로그에서 WebSocket 에러 확인
docker-compose -f docker-compose.dev.yml logs api | grep -i socket
```

---

## 유용한 명령어 모음

```bash
# === Docker ===
# 모든 컨테이너 중지 및 삭제
docker-compose -f docker-compose.dev.yml down

# 볼륨까지 삭제 (DB 초기화)
docker-compose -f docker-compose.dev.yml down -v

# 이미지 재빌드
docker-compose -f docker-compose.dev.yml build --no-cache

# === 데이터베이스 ===
# DB 쉘 접속
docker-compose -f docker-compose.dev.yml exec postgres psql -U boardgame -d boardgame_dev

# 테이블 목록
\dt

# 특정 테이블 조회
SELECT * FROM users;
SELECT * FROM rooms;

# === Redis ===
# Redis CLI 접속
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# 모든 키 조회
KEYS *

# 특정 키 조회
GET session:xxx
HGETALL room:ABC123:users

# 키 삭제
DEL session:xxx

# === 로그 ===
# 실시간 로그
docker-compose -f docker-compose.dev.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.dev.yml logs -f api
docker-compose -f docker-compose.dev.yml logs -f web

# 최근 100줄만
docker-compose -f docker-compose.dev.yml logs --tail 100 api
```

---

## 다음 단계

- [아키텍처 이해하기](./ARCHITECTURE.md)
- [프로덕션 배포](../DEPLOYMENT.md)
