# Board Game Platform

실시간 멀티플레이어 보드게임 플랫폼입니다. 현재 **아발론(The Resistance: Avalon)** 게임을 지원합니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| **Backend** | FastAPI, Python 3.11, Socket.IO |
| **Database** | PostgreSQL 15, Redis 7 |
| **Infra** | Docker, Nginx, Cloudflare Tunnel |

## 프로젝트 구조

```
board-game-platform/
├── apps/
│   ├── api/                 # FastAPI 백엔드
│   │   ├── app/
│   │   │   ├── api/         # REST API 라우터
│   │   │   ├── db/          # 데이터베이스 연결 (PostgreSQL, Redis)
│   │   │   ├── models/      # SQLAlchemy ORM 모델
│   │   │   ├── schemas/     # Pydantic 스키마
│   │   │   ├── services/    # 비즈니스 로직 (게임 엔진)
│   │   │   ├── sockets/     # Socket.IO 이벤트 핸들러
│   │   │   └── main.py      # 앱 진입점
│   │   └── alembic/         # DB 마이그레이션
│   │
│   └── web/                 # Next.js 프론트엔드
│       ├── app/             # 페이지 (App Router)
│       ├── components/      # React 컴포넌트
│       ├── stores/          # Zustand 상태 관리
│       └── lib/             # 유틸리티 (API 클라이언트, Socket)
│
├── docs/                    # 상세 문서
│   ├── ARCHITECTURE.md      # 아키텍처 설명
│   └── DEVELOPMENT.md       # 개발 환경 가이드
│
├── docker-compose.yml       # 기본 Docker Compose
├── docker-compose.dev.yml   # 개발 환경 설정
├── docker-compose.prod.yml  # 프로덕션 환경 설정
├── nginx.conf               # Nginx 설정
└── DEPLOYMENT.md            # 배포 가이드
```

## 빠른 시작

### 사전 요구사항

- Docker & Docker Compose
- Node.js 20+ (로컬 개발 시)
- Python 3.11+ (로컬 개발 시)

### 개발 환경 실행

```bash
# 1. 저장소 클론
git clone https://github.com/shoney921/board_game.git
cd board-game-platform

# 2. 환경변수 설정
cp .env.example .env

# 3. Docker로 개발 환경 실행
docker-compose -f docker-compose.dev.yml up --build

# 4. 접속
# - Frontend: http://localhost:3003
# - Backend API: http://localhost:8003
# - API 문서: http://localhost:8003/docs
```

### 프로덕션 배포

```bash
# 1. 환경변수 설정
cp .env.production.example .env.production
# .env.production 파일을 실제 값으로 수정

# 2. 프로덕션 빌드 및 실행
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# 3. 접속
# - http://localhost:8081 (로컬)
# - https://your-domain.com (Cloudflare Tunnel 설정 시)
```

## 문서

- [아키텍처 가이드](./docs/ARCHITECTURE.md) - 시스템 구조와 데이터 흐름
- [개발 환경 가이드](./docs/DEVELOPMENT.md) - 로컬 개발 환경 설정
- [배포 가이드](./DEPLOYMENT.md) - 프로덕션 배포 방법

## 주요 기능

### 아발론 게임
- 5~10명 실시간 멀티플레이어
- 역할 자동 배정 (멀린, 암살자, 모드레드 등)
- 원정대 선택 및 투표
- 미션 수행 및 결과
- 암살 단계

### 플랫폼 기능
- 게스트 로그인 (즉시 플레이)
- 방 생성 및 참가
- 실시간 채팅
- **모바일 재접속 지원** - 화면 잠김/브라우저 닫힘 후에도 게임 복귀 가능

## 라이선스

MIT License
