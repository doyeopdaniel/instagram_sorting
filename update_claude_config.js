#!/usr/bin/env node

/**
 * Claude Code 설정에 Supabase MCP 자동 추가 스크립트
 * 실행 방법: node update_claude_config.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), '.claude.json');
const CURRENT_PROJECT_PATH = process.cwd();

console.log('🔧 Claude Code 설정 업데이트');
console.log('============================');
console.log(`📁 현재 프로젝트: ${CURRENT_PROJECT_PATH}`);
console.log(`⚙️  설정 파일: ${CLAUDE_CONFIG_PATH}`);
console.log('');

// 환경변수 확인
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!token || !projectRef) {
  console.log('⚠️  환경변수가 설정되지 않았습니다.');
  console.log('');
  console.log('다음 두 가지 방법 중 하나를 선택하세요:');
  console.log('');
  console.log('1️⃣  환경변수 설정 후 재실행:');
  console.log('export SUPABASE_ACCESS_TOKEN="your_token"');
  console.log('export SUPABASE_PROJECT_REF="your_project_ref"');
  console.log('node update_claude_config.js');
  console.log('');
  console.log('2️⃣  수동으로 설정 파일 편집:');
  console.log('- supabase_mcp_config.json 파일을 참고하세요');
  console.log('- YOUR_PROJECT_REF_HERE와 YOUR_PERSONAL_ACCESS_TOKEN_HERE를 실제 값으로 교체하세요');
  process.exit(1);
}

try {
  // Claude 설정 파일 읽기
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) {
    console.error('❌ Claude 설정 파일을 찾을 수 없습니다.');
    console.log('💡 Claude Code가 설치되어 있고 한 번 이상 실행되었는지 확인하세요.');
    process.exit(1);
  }

  const claudeConfig = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, 'utf8'));
  
  // 현재 프로젝트 설정 찾기 또는 생성
  if (!claudeConfig.projects) {
    claudeConfig.projects = {};
  }
  
  if (!claudeConfig.projects[CURRENT_PROJECT_PATH]) {
    claudeConfig.projects[CURRENT_PROJECT_PATH] = {
      allowedTools: [],
      history: [],
      mcpContextUris: [],
      mcpServers: {},
      enabledMcpjsonServers: [],
      disabledMcpjsonServers: []
    };
  }

  const projectConfig = claudeConfig.projects[CURRENT_PROJECT_PATH];

  // MCP 서버 설정 추가
  if (!projectConfig.mcpServers) {
    projectConfig.mcpServers = {};
  }

  // Supabase MCP 설정
  const supabaseMcpConfig = {
    command: "npx",
    args: [
      "-y",
      "@supabase/mcp-server-supabase@latest",
      "--read-only",
      `--project-ref=${projectRef}`
    ],
    env: {
      SUPABASE_ACCESS_TOKEN: token
    }
  };

  // 기존 supabase 설정이 있는지 확인
  if (projectConfig.mcpServers.supabase) {
    console.log('⚠️  기존 Supabase MCP 설정이 발견되었습니다.');
    console.log('기존 설정을 덮어쓰시겠습니까? (y/N): ');
    
    // 간단한 확인을 위해 동기식 입력 처리
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('', (answer) => {
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ 취소되었습니다.');
        readline.close();
        process.exit(0);
      }
      
      updateConfig();
      readline.close();
    });
    return;
  }

  updateConfig();

  function updateConfig() {
    // 설정 업데이트
    projectConfig.mcpServers.supabase = supabaseMcpConfig;

    // 백업 생성
    const backupPath = `${CLAUDE_CONFIG_PATH}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, fs.readFileSync(CLAUDE_CONFIG_PATH));
    console.log(`💾 백업 생성: ${backupPath}`);

    // 새 설정 저장
    fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(claudeConfig, null, 2));

    console.log('');
    console.log('✅ Claude Code 설정이 성공적으로 업데이트되었습니다!');
    console.log('');
    console.log('📋 추가된 설정:');
    console.log(`   프로젝트: ${CURRENT_PROJECT_PATH}`);
    console.log(`   MCP 서버: supabase`);
    console.log(`   Project Ref: ${projectRef}`);
    console.log('');
    console.log('🔄 다음 단계:');
    console.log('1. Claude Code를 재시작하세요');
    console.log('2. 다음과 같은 질문으로 테스트해보세요:');
    console.log('   - "내 Supabase 프로젝트의 테이블을 보여줘"');
    console.log('   - "데이터베이스 스키마를 분석해줘"');
    console.log('');
    console.log('⚠️  문제가 발생하면 백업 파일로 복원할 수 있습니다:');
    console.log(`   mv "${backupPath}" "${CLAUDE_CONFIG_PATH}"`);
  }

} catch (error) {
  console.error('💥 오류 발생:', error.message);
  
  if (error.code === 'EACCES') {
    console.log('💡 권한 문제일 수 있습니다. sudo 없이 다시 시도해보세요.');
  } else if (error instanceof SyntaxError) {
    console.log('💡 Claude 설정 파일이 손상되었을 수 있습니다.');
    console.log('   Claude Code를 재시작한 후 다시 시도해보세요.');
  }
  
  process.exit(1);
}