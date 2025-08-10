#!/bin/bash

# Supabase MCP 환경변수 설정 스크립트
# 사용법: ./setup_supabase_env.sh

echo "🚀 Supabase MCP 환경 설정"
echo "=========================="

# 환경변수 파일 생성
ENV_FILE="$HOME/.supabase_mcp"

echo ""
echo "Supabase Personal Access Token을 입력하세요:"
read -s SUPABASE_TOKEN

echo ""
echo "Supabase Project Reference ID를 입력하세요:"
read PROJECT_REF

# 환경변수 파일에 저장
echo "export SUPABASE_ACCESS_TOKEN=\"$SUPABASE_TOKEN\"" > "$ENV_FILE"
echo "export SUPABASE_PROJECT_REF=\"$PROJECT_REF\"" >> "$ENV_FILE"

# 파일 권한 설정 (소유자만 읽기 가능)
chmod 600 "$ENV_FILE"

echo ""
echo "✅ 환경변수가 저장되었습니다: $ENV_FILE"
echo ""
echo "다음 명령어를 실행하여 환경변수를 로드하세요:"
echo "source $ENV_FILE"
echo ""
echo "또는 다음을 ~/.bashrc 또는 ~/.zshrc에 추가하세요:"
echo "source $ENV_FILE"
echo ""

# Claude Code 설정 예시 생성
cat > supabase_mcp_config_env.json << EOF
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=$PROJECT_REF"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "\${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
EOF

echo "📋 환경변수를 사용한 Claude Code 설정이 생성되었습니다:"
echo "파일: supabase_mcp_config_env.json"
echo ""
echo "⚠️  보안 주의사항:"
echo "- 토큰을 절대 공유하지 마세요"
echo "- 환경변수 파일을 Git에 커밋하지 마세요"
echo "- 정기적으로 토큰을 갱신하세요"