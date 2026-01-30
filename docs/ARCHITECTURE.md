# 아키텍처 가이드

이 문서는 Board Game Platform의 전체 아키텍처를 설명합니다.

## 목차

1. [시스템 아키텍처](#시스템-아키텍처)
2. [서비스별 역할](#서비스별-역할)
3. [데이터 흐름](#데이터-흐름)
4. [기술 스택 상세](#기술-스택-상세)
5. [디렉토리 구조 상세](#디렉토리-구조-상세)

---

## 시스템 아키텍처

### 전체 구성도

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            인터넷                                        │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Cloudflare Tunnel                                   │
│                   (HTTPS 종단, DDoS 보호, SSL 인증서)                     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ http (내부)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Nginx (포트 8081)                                 │
│                      리버스 프록시 / 라우팅                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  /api/*        → API 서버 (포트 8000)                            │   │
│  │  /socket.io/*  → API 서버 (WebSocket 업그레이드)                 │   │
│  │  /*            → Web 서버 (포트 3000)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────┬───────────────────┘
                 │                                    │
                 ▼                                    ▼
┌────────────────────────────┐          ┌────────────────────────────┐
│      API Server            │          │      Web Server            │
│      (FastAPI)             │          │      (Next.js)             │
│                            │          │                            │
│  • REST API                │          │  • SSR/SSG 페이지          │
│  • Socket.IO (실시간)      │          │  • React 컴포넌트          │
│  • 게임 로직               │          │  • 상태 관리 (Zustand)     │
│                            │          │                            │
│  포트: 8000                │          │  포트: 3000                │
└─────────────┬──────────────┘          └────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          데이터 저장소                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │       PostgreSQL            │  │           Redis                  │  │
│  │       (포트 5432)           │  │         (포트 6379)              │  │
│  │                             │  │                                  │  │
│  │  • 사용자 정보              │  │  • 세션 데이터                   │  │
│  │  • 방 정보                  │  │  • 게임 상태 (재접속용)          │  │
│  │  • 영구 저장 데이터         │  │  • 방 참가자 목록                │  │
│  │                             │  │  • 입장 순서 (ZSET)              │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 개발 vs 프로덕션 환경 비교

| 구성요소 | 개발 환경 | 프로덕션 환경 |
|---------|----------|--------------|
| **접속 방식** | 직접 포트 접속 | Cloudflare Tunnel (HTTPS) |
| **프록시** | 없음 | Nginx |
| **API 포트** | 8003 (외부 노출) | 8000 (내부만) |
| **Web 포트** | 3003 (외부 노출) | 3000 (내부만) |
| **외부 포트** | 3003, 8003 | 8081 (Nginx) |
| **Hot Reload** | 지원 (볼륨 마운트) | 미지원 |
| **빌드 방식** | 개발 모드 | 프로덕션 빌드 |
| **로깅** | 상세 (DEBUG) | 최소 (INFO) |
| **DB 포트** | 5435 (외부 노출) | 내부만 |

---

## 서비스별 역할

### 1. Nginx (리버스 프록시)

**역할:**
- URL 경로 기반 라우팅
- WebSocket 업그레이드 처리
- 정적 파일 캐싱
- 로드 밸런싱 (확장 시)

**라우팅 규칙:**
```nginx
# API 요청 → API 서버
/api/*        → http://api:8000
/socket.io/*  → http://api:8000 (WebSocket 업그레이드)

# 그 외 모든 요청 → Web 서버
/*            → http://web:3000
```

### 2. API Server (FastAPI + Socket.IO)

**역할:**
- REST API 제공 (사용자 인증, 방 관리)
- WebSocket 실시간 통신 (게임 이벤트)
- 게임 로직 처리 (아발론 엔진)
- 데이터베이스 연동

**주요 모듈:**
```
apps/api/app/
├── api/           # REST API 라우터
│   ├── auth.py    # 인증 API
│   ├── rooms.py   # 방 관리 API
│   └── users.py   # 사용자 API
│
├── sockets/       # Socket.IO 이벤트
│   └── manager.py # 연결 관리, 게임 이벤트 핸들러
│
├── services/      # 비즈니스 로직
│   └── avalon.py  # 아발론 게임 엔진
│
├── models/        # SQLAlchemy ORM
│   ├── user.py
│   └── room.py
│
└── db/            # 데이터베이스 연결
    ├── database.py  # PostgreSQL
    └── redis.py     # Redis
```

### 3. Web Server (Next.js)

**역할:**
- 서버 사이드 렌더링 (SSR)
- 클라이언트 상태 관리
- Socket.IO 클라이언트

**주요 모듈:**
```
apps/web/
├── app/              # 페이지 (App Router)
│   ├── page.tsx      # 홈 (로그인)
│   ├── room/[code]/  # 대기실
│   └── game/[code]/  # 게임 화면
│
├── stores/           # Zustand 상태 관리
│   ├── userStore.ts  # 사용자 상태
│   ├── roomStore.ts  # 방 상태
│   ├── gameStore.ts  # 게임 상태
│   └── socketStore.ts # 소켓 연결
│
├── components/       # React 컴포넌트
│   └── game/         # 게임 UI 컴포넌트
│
└── lib/              # 유틸리티
    ├── api.ts        # REST API 클라이언트
    └── socket.ts     # Socket.IO 클라이언트
```

### 4. PostgreSQL

**역할:**
- 영구 데이터 저장
- 사용자 정보, 방 정보

**주요 테이블:**
```sql
users        -- 사용자 (id, username, display_name, ...)
rooms        -- 방 (id, code, host_id, game_type, status, ...)
```

### 5. Redis

**역할:**
- 세션 저장 (빠른 접근)
- 게임 상태 캐싱 (재접속 지원)
- 실시간 데이터 (방 참가자)

**주요 키:**
```
session:{session_id}     -- 사용자 세션 (JSON)
room:{room_id}:users     -- 방 참가자 (Hash: user_id → socket_id)
room:{room_id}:order     -- 입장 순서 (Sorted Set: user_id, score=timestamp)
room:{room_id}:game_id   -- 활성 게임 ID (String)
game:{game_id}:state     -- 게임 상태 (JSON, 2시간 만료)
```

### 6. Cloudflare Tunnel

**역할:**
- 외부 HTTPS 접근 제공
- SSL 인증서 자동 관리
- DDoS 보호
- 서버 IP 숨김

**작동 방식:**
```
사용자 → Cloudflare Edge → Tunnel → 서버의 Nginx
```

---

## 데이터 흐름

### 1. 게임 시작 흐름

```
[방장이 게임 시작 클릭]
         │
         ▼
┌─────────────────────┐
│  Web (GamePage)     │
│  startGame() 호출   │
└─────────┬───────────┘
          │ socket.emit('start_game')
          ▼
┌─────────────────────┐
│  API (Socket.IO)    │
│  start_game 핸들러  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Avalon Engine      │
│  • 역할 배정        │
│  • 게임 상태 초기화 │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Redis              │
│  게임 상태 저장     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  모든 플레이어에게   │
│  game_started,      │
│  role_assigned 전송 │
└─────────────────────┘
```

### 2. 재접속 흐름 (모바일 지원)

```
[사용자가 페이지 새로고침 또는 재접속]
         │
         ▼
┌─────────────────────────────────────┐
│  Web (GamePage)                     │
│  1. localStorage에서 gameId 복구   │
│  2. Socket 연결                     │
│  3. join_room + rejoin_game 전송   │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  API (Socket.IO)                    │
│  rejoin_game 핸들러                 │
│  • room_id로 game_id 조회 (Redis)   │
│  • 게임 상태 조회 (Redis)           │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│  사용자에게 전송                     │
│  • rejoin_result (성공/실패)        │
│  • role_assigned (역할 정보)        │
│  • game_state_update (현재 상태)    │
└─────────────────────────────────────┘
```

### 3. 투표/미션 흐름

```
[플레이어가 투표]
         │
         ▼
┌───────────────────┐
│  socket.emit()    │
│  vote_team 또는   │
│  vote_mission     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Avalon Engine    │
│  투표 처리        │
└─────────┬─────────┘
          │
          ├──[투표 진행 중]──→ 투표 현황 브로드캐스트
          │
          └──[투표 완료]────→ Redis 저장 → 결과 브로드캐스트
```

---

## 기술 스택 상세

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| FastAPI | 0.109+ | REST API 프레임워크 |
| python-socketio | 5.11+ | 실시간 WebSocket 통신 |
| SQLAlchemy | 2.0+ | ORM (PostgreSQL 연동) |
| Alembic | 1.13+ | DB 마이그레이션 |
| Redis | 5.0+ | 세션/캐시 클라이언트 |
| Pydantic | 2.0+ | 데이터 검증 |

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.1+ | React 프레임워크 (App Router) |
| TypeScript | 5.0+ | 타입 안전성 |
| Zustand | 4.5+ | 상태 관리 |
| socket.io-client | 4.7+ | 실시간 통신 |
| Tailwind CSS | 3.4+ | 스타일링 |
| Framer Motion | 11+ | 애니메이션 |

### Infrastructure

| 기술 | 버전 | 용도 |
|------|------|------|
| Docker | 20.10+ | 컨테이너화 |
| Docker Compose | 2.0+ | 멀티 컨테이너 관리 |
| Nginx | 1.25+ | 리버스 프록시 |
| PostgreSQL | 15 | 관계형 데이터베이스 |
| Redis | 7 | 인메모리 데이터 저장소 |
| Cloudflare Tunnel | - | HTTPS 터널링 |

---

## 디렉토리 구조 상세

```
board-game-platform/
│
├── apps/
│   ├── api/                          # === 백엔드 ===
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py               # FastAPI + Socket.IO 앱 초기화
│   │   │   ├── config.py             # 환경설정 (CORS, DB URL 등)
│   │   │   │
│   │   │   ├── api/                  # REST API
│   │   │   │   ├── auth.py           # POST /api/auth/guest
│   │   │   │   ├── rooms.py          # POST/GET /api/rooms
│   │   │   │   └── users.py          # GET /api/users
│   │   │   │
│   │   │   ├── sockets/              # Socket.IO 이벤트
│   │   │   │   └── manager.py        # join_room, start_game, vote 등
│   │   │   │
│   │   │   ├── services/             # 비즈니스 로직
│   │   │   │   └── avalon.py         # 아발론 게임 엔진
│   │   │   │
│   │   │   ├── models/               # SQLAlchemy 모델
│   │   │   │   ├── user.py
│   │   │   │   └── room.py
│   │   │   │
│   │   │   ├── schemas/              # Pydantic 스키마
│   │   │   │   ├── user.py
│   │   │   │   └── room.py
│   │   │   │
│   │   │   └── db/                   # 데이터베이스
│   │   │       ├── database.py       # PostgreSQL 연결
│   │   │       └── redis.py          # Redis 연결
│   │   │
│   │   ├── alembic/                  # DB 마이그레이션
│   │   │   └── versions/
│   │   │
│   │   ├── Dockerfile                # 프로덕션 이미지
│   │   ├── Dockerfile.dev            # 개발 이미지
│   │   └── requirements.txt          # Python 의존성
│   │
│   └── web/                          # === 프론트엔드 ===
│       ├── app/                      # Next.js App Router
│       │   ├── page.tsx              # / (홈, 로그인)
│       │   ├── layout.tsx            # 레이아웃
│       │   ├── room/
│       │   │   └── [code]/
│       │   │       └── page.tsx      # /room/:code (대기실)
│       │   └── game/
│       │       └── [code]/
│       │           └── page.tsx      # /game/:code (게임)
│       │
│       ├── components/               # React 컴포넌트
│       │   ├── game/                 # 게임 관련
│       │   │   ├── PlayerCircle.tsx
│       │   │   ├── RoleCard.tsx
│       │   │   ├── ActionPanel.tsx
│       │   │   └── ...
│       │   └── ...
│       │
│       ├── stores/                   # Zustand 스토어
│       │   ├── userStore.ts          # 로그인 사용자
│       │   ├── roomStore.ts          # 방 정보
│       │   ├── gameStore.ts          # 게임 상태
│       │   └── socketStore.ts        # 소켓 연결
│       │
│       ├── lib/                      # 유틸리티
│       │   ├── api.ts                # Axios API 클라이언트
│       │   └── socket.ts             # Socket.IO 클라이언트
│       │
│       ├── Dockerfile.prod           # 프로덕션 이미지
│       ├── Dockerfile.dev            # 개발 이미지
│       └── package.json              # Node.js 의존성
│
├── docs/                             # 문서
│   ├── ARCHITECTURE.md               # 이 문서
│   └── DEVELOPMENT.md                # 개발 환경 가이드
│
├── docker-compose.yml                # 기본 (참조용)
├── docker-compose.dev.yml            # 개발 환경
├── docker-compose.prod.yml           # 프로덕션 환경
├── nginx.conf                        # Nginx 설정
├── DEPLOYMENT.md                     # 배포 가이드
└── README.md                         # 프로젝트 개요
```

---

## 환경별 설정 파일

### 개발 환경 (.env)

```bash
# 개발용 기본값 (docker-compose.dev.yml에서 사용)
POSTGRES_USER=boardgame
POSTGRES_PASSWORD=boardgame_secret
POSTGRES_DB=boardgame_dev
SECRET_KEY=dev-secret-key
CORS_ORIGINS=http://localhost:3003
```

### 프로덕션 환경 (.env.production)

```bash
# 프로덕션용 (반드시 안전한 값으로 변경)
DB_USER=boardgame
DB_PASSWORD=<강력한_비밀번호>
DB_NAME=boardgame_prod
SECRET_KEY=<랜덤_시크릿_키>
API_URL=https://your-domain.com
WS_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
CLOUDFLARE_TUNNEL_TOKEN=<터널_토큰>
```

---

## 다음 단계

- [개발 환경 설정](./DEVELOPMENT.md) - 로컬에서 개발 시작하기
- [배포 가이드](../DEPLOYMENT.md) - 프로덕션 배포 방법
