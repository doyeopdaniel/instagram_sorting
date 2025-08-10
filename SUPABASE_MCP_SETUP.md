# Supabase MCP 설정 가이드

Supabase Model Context Protocol (MCP) 서버를 Claude Code와 연동하는 방법을 설명합니다.

## 📋 필요한 정보

1. **Supabase Personal Access Token** - Supabase 계정 설정에서 생성
2. **Project Reference** - Supabase 프로젝트의 고유 식별자
3. **Claude Code 설정** - MCP 서버 추가

## 🔑 1단계: Supabase Personal Access Token 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 우상단 프로필 아이콘 클릭 → **Account Settings**
3. **Access Tokens** 탭으로 이동
4. **Generate new token** 클릭
5. 토큰 이름 입력 (예: "Claude MCP Server")
6. 생성된 토큰을 안전한 곳에 복사해 둡니다

⚠️ **보안 주의사항:**
- 토큰은 한 번만 표시되므로 반드시 복사해 두세요
- 프로덕션 프로젝트가 아닌 개발/테스트 프로젝트 사용 권장
- 토큰은 절대 공개하지 마세요

## 🎯 2단계: Project Reference 확인

1. Supabase 프로젝트 대시보드로 이동
2. **Settings** → **General** 탭
3. **Reference ID** 확인 (예: `abcdefghijklmnop`)

## ⚙️ 3단계: Claude Code MCP 설정

### 방법 1: 수동 설정 (권장)

1. Claude Code에서 현재 프로젝트의 `.claude.json` 파일 수정
2. 아래 설정을 `mcpServers` 섹션에 추가:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=YOUR_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_PERSONAL_ACCESS_TOKEN"
      }
    }
  }
}
```

### 방법 2: 환경변수 사용 (보안 강화)

시스템 환경변수에 토큰 설정:
```bash
export SUPABASE_ACCESS_TOKEN="your_token_here"
```

그 후 설정에서 환경변수 참조:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=YOUR_PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

## 🚀 4단계: 설정 테스트

1. Claude Code 재시작
2. MCP 서버 연결 확인
3. Supabase 관련 쿼리나 작업 테스트

## 📚 사용 예시

MCP 설정 완료 후 Claude에게 다음과 같은 요청이 가능합니다:

- "내 Supabase 프로젝트의 테이블 구조를 보여줘"
- "users 테이블에서 최근 가입한 사용자 10명을 조회해줘"
- "데이터베이스 성능 최적화 제안을 해줘"
- "새로운 테이블 생성 도움말"

## 🔐 보안 모범 사례

1. **Read-only 모드 사용**: `--read-only` 플래그로 데이터 수정 방지
2. **프로젝트 범위 제한**: `--project-ref`로 특정 프로젝트만 접근
3. **개발 환경 사용**: 프로덕션이 아닌 개발/스테이징 환경 사용
4. **토큰 관리**: 정기적인 토큰 갱신 및 불필요한 토큰 삭제
5. **접근 로그 모니터링**: Supabase 대시보드에서 API 사용량 확인

## 🛠️ 문제 해결

### MCP 서버가 시작되지 않는 경우
- Node.js 버전 확인 (v18 이상 권장)
- 네트워크 연결 확인
- 토큰 유효성 검증

### 권한 오류가 발생하는 경우
- 토큰 권한 확인
- 프로젝트 액세스 권한 확인
- Read-only 모드 설정 확인

### 연결이 불안정한 경우
- Supabase 서비스 상태 확인
- 방화벽 설정 확인
- VPN 연결 시 설정 검토

## 📞 지원

- [Supabase 공식 문서](https://supabase.com/docs)
- [MCP 설정 가이드](https://supabase.com/docs/guides/getting-started/mcp)
- [Claude Code 문서](https://docs.anthropic.com/claude/docs)

## 📝 참고사항

- MCP 서버는 현재 베타 기능입니다
- 일부 기능이 제한될 수 있습니다
- 정기적인 업데이트를 확인하세요