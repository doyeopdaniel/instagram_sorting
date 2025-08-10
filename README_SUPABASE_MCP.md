# 🚀 Supabase MCP 설정 완료 가이드

이 프로젝트에 Supabase Model Context Protocol (MCP) 서버가 설정되었습니다.

## 📦 포함된 파일들

```
📁 Supabase MCP 설정 파일들
├── 📋 SUPABASE_MCP_SETUP.md          # 상세한 설정 가이드
├── ⚙️  supabase_mcp_config.json      # 기본 MCP 설정 템플릿
├── 🔧 setup_supabase_env.sh          # 환경변수 설정 스크립트
├── 🧪 test_supabase_mcp.js           # MCP 연결 테스트 스크립트
├── 🔄 update_claude_config.js        # Claude Code 설정 자동 업데이트
└── 📖 README_SUPABASE_MCP.md         # 이 파일
```

## 🚀 빠른 시작 (3단계)

### 1️⃣ Supabase 토큰 생성
1. [Supabase Dashboard](https://supabase.com/dashboard) 로그인
2. 우상단 프로필 → **Account Settings** → **Access Tokens**
3. **Generate new token** → 이름 입력 (예: "Claude MCP")
4. 생성된 토큰 복사

### 2️⃣ 환경변수 설정
```bash
# 자동 설정 (권장)
./setup_supabase_env.sh

# 또는 수동 설정
export SUPABASE_ACCESS_TOKEN="your_token_here"
export SUPABASE_PROJECT_REF="your_project_ref_here"
```

### 3️⃣ Claude Code 설정
```bash
# 자동 설정 (권장)
node update_claude_config.js

# 또는 수동으로 .claude.json 편집
```

## 🧪 테스트

```bash
# MCP 서버 연결 테스트
node test_supabase_mcp.js
```

연결이 성공하면 Claude Code를 재시작하고 다음과 같이 테스트:
- "내 Supabase 프로젝트의 테이블 구조를 보여줘"
- "데이터베이스 성능을 분석해줘"

## 🔐 보안 설정

- ✅ **Read-only 모드**: 데이터 수정 방지
- ✅ **프로젝트 범위 제한**: 특정 프로젝트만 접근
- ✅ **환경변수 사용**: 토큰 안전 보관
- ✅ **개발 환경 권장**: 프로덕션 데이터 보호

## 📚 주요 기능

### 🔍 데이터베이스 분석
- 테이블 구조 조회
- 인덱스 및 관계 분석
- 성능 최적화 제안

### 📊 쿼리 도움
- SQL 쿼리 생성 및 최적화
- 데이터 조회 및 분석
- 스키마 설계 조언

### 🛠️ 개발 지원
- API 엔드포인트 설계
- 보안 설정 가이드
- 모범 사례 추천

## 🆘 문제 해결

### 연결 오류
```bash
# 토큰 확인
echo $SUPABASE_ACCESS_TOKEN

# 프로젝트 참조 확인
echo $SUPABASE_PROJECT_REF

# 패키지 버전 확인
npx @supabase/mcp-server-supabase@latest --version
```

### 권한 오류
- Supabase 프로젝트 접근 권한 확인
- 토큰 만료 여부 확인
- API 제한 확인

### Claude Code 연결 안됨
- Claude Code 재시작
- MCP 서버 설정 재확인
- 로그 파일 확인

## 📞 지원 및 문서

- 📋 [상세 설정 가이드](./SUPABASE_MCP_SETUP.md)
- 🌐 [Supabase MCP 공식 문서](https://supabase.com/docs/guides/getting-started/mcp)
- 💬 [Claude Code 문서](https://docs.anthropic.com/claude/docs)

## 🔄 업데이트

```bash
# MCP 서버 업데이트
npx @supabase/mcp-server-supabase@latest

# 설정 재적용
node update_claude_config.js
```

---

**⚡ 팁**: 환경변수를 `~/.bashrc` 또는 `~/.zshrc`에 추가하면 재부팅 후에도 유지됩니다.

```bash
echo 'source ~/.supabase_mcp' >> ~/.zshrc
```