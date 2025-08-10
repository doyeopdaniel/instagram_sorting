#!/usr/bin/env node

/**
 * Supabase MCP 연결 테스트 스크립트
 * 실행 방법: node test_supabase_mcp.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Supabase MCP 연결 테스트 시작');
console.log('================================');

// 환경변수 확인
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF;

if (!token) {
  console.error('❌ SUPABASE_ACCESS_TOKEN 환경변수가 설정되지 않았습니다.');
  console.log('💡 다음 명령어로 설정하세요:');
  console.log('export SUPABASE_ACCESS_TOKEN="your_token_here"');
  process.exit(1);
}

if (!projectRef) {
  console.error('❌ SUPABASE_PROJECT_REF 환경변수가 설정되지 않았습니다.');
  console.log('💡 다음 명령어로 설정하세요:');
  console.log('export SUPABASE_PROJECT_REF="your_project_ref_here"');
  process.exit(1);
}

console.log('✅ 환경변수 확인 완료');
console.log(`📋 Project Reference: ${projectRef}`);
console.log(`🔑 Token: ${token.substring(0, 10)}...`);
console.log('');

// MCP 서버 테스트
console.log('🚀 MCP 서버 연결 테스트 중...');

const mcpProcess = spawn('npx', [
  '-y',
  '@supabase/mcp-server-supabase@latest',
  '--read-only',
  `--project-ref=${projectRef}`
], {
  env: {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: token
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';
let timeout;

mcpProcess.stdout.on('data', (data) => {
  output += data.toString();
  console.log('📤 서버 출력:', data.toString().trim());
});

mcpProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('⚠️  서버 오류:', data.toString().trim());
});

mcpProcess.on('close', (code) => {
  clearTimeout(timeout);
  console.log('');
  console.log('🏁 테스트 완료');
  console.log('==============');
  
  if (code === 0) {
    console.log('✅ MCP 서버가 성공적으로 시작되었습니다!');
    console.log('');
    console.log('📋 다음 단계:');
    console.log('1. Claude Code에서 MCP 설정 추가');
    console.log('2. Claude Code 재시작');
    console.log('3. Supabase 관련 질문으로 테스트');
  } else {
    console.log(`❌ MCP 서버 시작 실패 (종료 코드: ${code})`);
    
    if (errorOutput.includes('authentication') || errorOutput.includes('token')) {
      console.log('💡 토큰 관련 오류일 가능성이 높습니다.');
      console.log('   - 토큰이 유효한지 확인하세요');
      console.log('   - Supabase 대시보드에서 토큰 권한을 확인하세요');
    }
    
    if (errorOutput.includes('project') || errorOutput.includes('reference')) {
      console.log('💡 프로젝트 참조 오류일 가능성이 높습니다.');
      console.log('   - Project Reference ID가 정확한지 확인하세요');
      console.log('   - 해당 프로젝트에 대한 접근 권한이 있는지 확인하세요');
    }
  }
  
  console.log('');
  console.log('📚 도움말:');
  console.log('- Supabase 설정 가이드: ./SUPABASE_MCP_SETUP.md');
  console.log('- Supabase 공식 문서: https://supabase.com/docs/guides/getting-started/mcp');
});

mcpProcess.on('error', (error) => {
  clearTimeout(timeout);
  console.log('');
  console.log('💥 프로세스 실행 오류:', error.message);
  
  if (error.code === 'ENOENT') {
    console.log('💡 Node.js 또는 npm이 설치되지 않았을 수 있습니다.');
    console.log('   다음을 확인하세요:');
    console.log('   - Node.js 설치: https://nodejs.org/');
    console.log('   - npm 버전: npm --version');
  }
});

// 30초 후 타임아웃
timeout = setTimeout(() => {
  console.log('⏰ 타임아웃: 30초 경과');
  console.log('✅ MCP 서버가 정상적으로 시작된 것 같습니다.');
  console.log('   (백그라운드에서 계속 실행 중)');
  
  mcpProcess.kill('SIGTERM');
  
  setTimeout(() => {
    mcpProcess.kill('SIGKILL');
  }, 5000);
}, 30000);

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n🛑 테스트 중단');
  mcpProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 테스트 종료');
  mcpProcess.kill('SIGTERM');
  process.exit(0);
});