# Board Game Platform - 프로덕션 배포 가이드

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [사전 요구사항](#사전-요구사항)
3. [환경 설정](#환경-설정)
4. [배포 절차](#배포-절차)
5. [운영 명령어](#운영-명령어)
6. [모니터링](#모니터링)
7. [트러블슈팅](#트러블슈팅)
8. [파일 구조](#파일-구조)

---

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Tunnel                         │
│                   (HTTPS 종단, DDoS 보호)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ wss/https
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx (포트 8081)                            │
│                    (리버스 프록시, 로드밸런싱)                     │
└──────────┬─────────────────────────────────┬────────────────────┘
           │                                 │
           │ /api/*, /socket.io/*           │ /*
           ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│   API Server        │           │   Web Server        │
│   (FastAPI+SocketIO)│           │   (Next.js)         │
│   포트: 8000        │           │   포트: 3000        │
└─────────┬───────────┘           └─────────────────────┘
          │
          ▼
┌─────────────────────┐    ┌─────────────────────┐
│   PostgreSQL        │    │   Redis             │
│   (데이터 저장)      │    │   (세션/캐시)        │
│   포트: 5432        │    │   포트: 6379        │
└─────────────────────┘    └─────────────────────┘
```

### 서비스 설명

| 서비스 | 역할 | 컨테이너명 |
|--------|------|-----------|
| **nginx** | 리버스 프록시, 정적 파일 캐싱 | boardgame-prod-nginx |
| **api** | FastAPI 백엔드 + Socket.IO 실시간 통신 | boardgame-prod-api |
| **web** | Next.js 프론트엔드 | boardgame-prod-web |
| **postgres** | PostgreSQL 데이터베이스 | boardgame-prod-postgres |
| **redis** | Redis 세션/캐시 저장소 | boardgame-prod-redis |
| **cloudflared** | Cloudflare Tunnel 클라이언트 | boardgame-prod-cloudflared |

---

## 사전 요구사항

### 서버 요구사항
- Docker 20.10+
- Docker Compose v2.0+
- 최소 2GB RAM
- 10GB 이상의 디스크 공간

### 외부 서비스
- Cloudflare 계정 (Zero Trust 접근 필요)
- 도메인 (Cloudflare에 연결된 도메인)

---

## 환경 설정

### 1. 환경변수 파일 생성

```bash
cp .env.production.example .env.production
```

### 2. 환경변수 설정

`.env.production` 파일을 편집합니다:

```bash
# Database - 보안을 위해 강력한 비밀번호 사용
DB_USER=boardgame
DB_PASSWORD=여기에_안전한_비밀번호_입력    # 예: openssl rand -hex 16
DB_NAME=boardgame_prod

# Security - 반드시 변경 필요
SECRET_KEY=여기에_시크릿키_입력            # 예: openssl rand -hex 32

# URLs - 실제 도메인으로 변경
API_URL=https://boardgame.yourdomain.com
WS_URL=https://boardgame.yourdomain.com
CORS_ORIGINS=https://boardgame.yourdomain.com

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=터널_토큰_입력
```

#### 시크릿 키 생성 방법

```bash
# SECRET_KEY 생성
openssl rand -hex 32

# DB_PASSWORD 생성
openssl rand -hex 16
```

### 3. Cloudflare Tunnel 설정

1. https://one.dash.cloudflare.com 접속
2. **Zero Trust** > **Networks** > **Tunnels** 이동
3. **Create a tunnel** 클릭
4. 터널 이름 입력 (예: `boardgame-prod`)
5. **Docker** 환경 선택
6. 토큰 복사 → `.env.production`의 `CLOUDFLARE_TUNNEL_TOKEN`에 입력
7. **Public Hostname** 설정:
   - Subdomain: `boardgame`
   - Domain: `yourdomain.com`
   - Service: `http://localhost:8081`

---

## 배포 절차

### 최초 배포

```bash
# 1. 프로젝트 디렉토리로 이동
cd /path/to/board-game-platform

# 2. 환경변수 설정 확인
cat .env.production

# 3. 프로덕션 컨테이너 빌드 및 실행
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# 4. 컨테이너 상태 확인 (모든 서비스가 Running인지 확인)
docker-compose -f docker-compose.prod.yml ps

# 5. 데이터베이스 마이그레이션
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 6. 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 업데이트 배포

```bash
# 코드 변경 후 재배포
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# 특정 서비스만 재배포 (예: API만)
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d api

# 프론트엔드만 재배포
docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d web
```

---

## 운영 명령어

### 서비스 관리

```bash
# 모든 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 서비스 시작
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 서비스 재시작
docker-compose -f docker-compose.prod.yml --env-file .env.production restart

# 특정 서비스만 재시작
docker-compose -f docker-compose.prod.yml --env-file .env.production restart api
docker-compose -f docker-compose.prod.yml --env-file .env.production restart web
docker-compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

### 로그 확인

```bash
# 모든 서비스 로그 (실시간)
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f cloudflared

# 최근 100줄만 보기
docker-compose -f docker-compose.prod.yml logs --tail 100 api
```

### 데이터베이스 관리

```bash
# 마이그레이션 실행
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 마이그레이션 상태 확인
docker-compose -f docker-compose.prod.yml exec api alembic current

# PostgreSQL 직접 접속
docker-compose -f docker-compose.prod.yml exec postgres psql -U boardgame -d boardgame_prod

# 데이터베이스 백업
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U boardgame boardgame_prod > backup_$(date +%Y%m%d).sql

# 데이터베이스 복원
cat backup_20260130.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U boardgame -d boardgame_prod
```

### 컨테이너 내부 접속

```bash
# API 컨테이너 쉘 접속
docker exec -it boardgame-prod-api bash

# Web 컨테이너 쉘 접속
docker exec -it boardgame-prod-web sh

# Redis CLI 접속
docker exec -it boardgame-prod-redis redis-cli
```

---

## 모니터링

### 헬스체크

```bash
# API 헬스체크
curl http://localhost:8081/health

# 프론트엔드 접속 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/

# Socket.IO 연결 확인
curl -s "http://localhost:8081/socket.io/?EIO=4&transport=polling"
```

### Cloudflare Tunnel 상태

```bash
# Tunnel 연결 상태 확인
docker logs boardgame-prod-cloudflared --tail 20

# 정상 연결 시 아래와 같은 로그 확인
# INF Registered tunnel connection connIndex=0 ... location=icn06
```

### 리소스 사용량

```bash
# 컨테이너별 리소스 사용량
docker stats

# 디스크 사용량
docker system df
```

---

## 트러블슈팅

### 1. WebSocket 연결 실패 (403 Forbidden)

**증상:** 브라우저에서 "연결 끊김" 표시, API 로그에 WebSocket 403 에러

**원인:** CORS 설정 불일치 또는 Socket.IO 앱 미사용

**해결:**
```bash
# 1. CORS 설정 확인
docker exec boardgame-prod-api python -c "from app.config import settings; print(settings.cors_origins_list)"

# 2. .env.production의 CORS_ORIGINS가 실제 도메인과 일치하는지 확인
# CORS_ORIGINS=https://boardgame.yourdomain.com

# 3. API 재시작
docker-compose -f docker-compose.prod.yml --env-file .env.production restart api
```

### 2. 프론트엔드에서 잘못된 API URL 사용

**증상:** 브라우저 콘솔에 `boardgame.yourdomain.com` 대신 다른 URL로 요청

**원인:** Next.js 빌드 시 환경변수가 제대로 전달되지 않음

**해결:**
```bash
# 웹 컨테이너 재빌드 (--env-file 필수!)
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache web
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d web
```

### 3. 포트 충돌

**증상:** `port is already allocated` 에러

**해결:**
```bash
# 포트 사용 중인 컨테이너 확인
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 8081

# 다른 포트 사용 시 docker-compose.prod.yml 수정
# nginx 서비스의 ports: "8081:80" → "8082:80"
# Cloudflare Tunnel 설정도 함께 변경 필요
```

### 4. 데이터베이스 연결 실패

**증상:** API 시작 실패, 데이터베이스 연결 에러

**해결:**
```bash
# PostgreSQL 상태 확인
docker-compose -f docker-compose.prod.yml ps postgres

# PostgreSQL 로그 확인
docker-compose -f docker-compose.prod.yml logs postgres

# 연결 테스트
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U boardgame
```

### 5. Cloudflare Tunnel 연결 실패

**증상:** 외부에서 접속 불가

**해결:**
```bash
# Tunnel 로그 확인
docker logs boardgame-prod-cloudflared

# 토큰 확인
# - Cloudflare 대시보드에서 토큰 재생성
# - .env.production 업데이트
# - cloudflared 재시작
docker-compose -f docker-compose.prod.yml --env-file .env.production restart cloudflared
```

### 6. 디스크 공간 부족

```bash
# Docker 캐시 정리
docker system prune -a

# 사용하지 않는 볼륨 정리
docker volume prune

# 오래된 이미지 정리
docker image prune -a
```

---

## 파일 구조

```
board-game-platform/
├── docker-compose.prod.yml     # 프로덕션 Docker Compose
├── docker-compose.dev.yml      # 개발 환경 Docker Compose
├── nginx.conf                  # Nginx 설정
├── .env.production             # 프로덕션 환경변수 (git 제외)
├── .env.production.example     # 환경변수 템플릿
│
├── apps/
│   ├── api/
│   │   ├── Dockerfile          # API 프로덕션 Dockerfile
│   │   ├── Dockerfile.dev      # API 개발 Dockerfile
│   │   ├── app/
│   │   │   ├── main.py         # FastAPI + Socket.IO 앱
│   │   │   ├── config.py       # 설정 (CORS 등)
│   │   │   └── sockets/        # Socket.IO 이벤트 핸들러
│   │   └── alembic/            # DB 마이그레이션
│   │
│   └── web/
│       ├── Dockerfile.prod     # 프론트엔드 프로덕션 Dockerfile
│       ├── Dockerfile.dev      # 프론트엔드 개발 Dockerfile
│       ├── .dockerignore       # Docker 빌드 제외 파일
│       └── next.config.js      # Next.js 설정 (output: standalone)
│
└── DEPLOYMENT.md               # 이 문서
```

### 주요 설정 파일 설명

| 파일 | 용도 |
|------|------|
| `docker-compose.prod.yml` | 프로덕션 서비스 정의 |
| `nginx.conf` | API/Web 라우팅, WebSocket 프록시, 캐싱 |
| `.env.production` | DB 비밀번호, API URL, Tunnel 토큰 등 |
| `apps/api/Dockerfile` | API 이미지 빌드 (socket_app 사용) |
| `apps/web/Dockerfile.prod` | Next.js standalone 빌드 |

---

## 자주 묻는 질문 (FAQ)

### Q: 환경변수를 변경했는데 적용이 안 됩니다

**A:** 환경변수 종류에 따라 다릅니다:

- **API 환경변수** (DB_USER, CORS_ORIGINS 등): API 재시작 필요
  ```bash
  docker-compose -f docker-compose.prod.yml --env-file .env.production restart api
  ```

- **프론트엔드 환경변수** (API_URL, WS_URL): 웹 재빌드 필요
  ```bash
  docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache web
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d web
  ```

### Q: 로컬에서 테스트하고 싶습니다

**A:** http://localhost:8081 로 접속하면 됩니다.

### Q: 도메인을 변경하고 싶습니다

**A:** 아래 항목들을 모두 변경해야 합니다:
1. `.env.production`의 API_URL, WS_URL, CORS_ORIGINS
2. Cloudflare Tunnel의 Public Hostname
3. 웹 컨테이너 재빌드

---

## 연락처

문제 발생 시 아래 정보와 함께 문의:
1. 에러 메시지 전문
2. `docker-compose -f docker-compose.prod.yml logs` 출력
3. 수행한 작업 내용
