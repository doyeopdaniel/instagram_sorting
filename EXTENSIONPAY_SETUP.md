# ExtensionPay 설정 가이드

이 가이드는 Reels Analyzer 확장 프로그램에 ExtensionPay를 통합하는 방법을 설명합니다.

## 🚀 ExtensionPay란?

ExtensionPay는 브라우저 확장 프로그램을 위한 결제 서비스입니다:
- **라이센스 키 불필요**: 사용자 계정 기반 인증
- **서버 관리 불필요**: 모든 결제 처리를 ExtensionPay가 담당
- **다중 기기 지원**: 여러 브라우저/기기에서 동일 계정 사용
- **쉬운 통합**: 5% 거래 수수료, 월 사용료 없음

## 📋 설정 단계

### 1. ExtensionPay 계정 생성
1. [ExtensionPay.com](https://extensionpay.com) 방문
2. 계정 생성 및 Stripe 계정 연결
3. 새 확장 프로그램 등록
4. Extension ID 받기 (예: 'reels-analyzer')

### 2. 코드 설정
1. `extensionpay-config.js`에서 Extension ID 업데이트:
```javascript
extensionId: 'your-actual-extension-id'
```

2. `background.js`에서 Extension ID 업데이트:
```javascript
const extpay = ExtPay('your-actual-extension-id');
```

### 3. 가격 설정
ExtensionPay 대시보드에서 가격 계획 설정:
- 월간 구독: $4.99
- 연간 구독: $29.99 (50% 할인)
- 평생 라이센스: $99.99

### 4. 무료 체험 설정 (선택사항)
- 7일 무료 체험 제공
- 일일 3회 무료 사용 제한

## 🔧 사용법

### 사용자 결제 상태 확인
```javascript
const user = await extpay.getUser();
if (user.paid) {
  // Pro 기능 활성화
} else {
  // 무료 기능만 제공
}
```

### 결제 페이지 열기
```javascript
extpay.openPaymentPage();
```

### 로그인 페이지 열기
```javascript
extpay.openLoginPage();
```

## 🎯 주요 기능

### 무료 티어
- 일일 3회 분석
- 기본 리치율 측정
- 기본 엥게이지먼트 분석

### Pro 티어
- ✨ **무제한 분석** - 일일 제한 없음
- 📊 **고급 메트릭** - 상세한 인사이트
- 🎯 **데이터 내보내기** - CSV & JSON 형식
- ⚡ **실시간 업데이트** - 라이브 모니터링
- 🔍 **커스텀 필터** - 맞춤형 분석
- 📈 **대량 분석** - 여러 계정 동시 분석

## 🛠️ 기술적 세부사항

### API 호출
ExtensionPay는 자동으로 사용자 상태를 관리합니다:
- 결제 완료 시 즉시 Pro 기능 활성화
- 브라우저/기기 간 동기화
- 자동 갱신 및 취소 처리

### 보안
- 모든 결제 정보는 ExtensionPay에서 안전하게 처리
- 확장 프로그램에서 민감한 정보 저장 없음
- HTTPS를 통한 모든 통신

### 분석
ExtensionPay 대시보드에서 제공:
- 매출 통계
- 사용자 전환율
- 구독 현황
- 환불 관리

## 🚨 중요 사항

1. **Extension ID 업데이트 필수**: 실제 ExtensionPay에서 받은 ID로 변경
2. **Stripe 연결**: 수익금 수령을 위해 Stripe 계정 필요
3. **테스트**: 프로덕션 배포 전 철저한 테스트 필요

## 📞 지원

- ExtensionPay 문서: https://extensionpay.com/docs
- GitHub: https://github.com/Glench/ExtPay
- 이메일 지원: support@extensionpay.com

## 🔄 기존 라이센스 키 시스템에서 마이그레이션

기존 라이센스 키 시스템을 사용하는 사용자들을 위한 마이그레이션 전략:

1. **점진적 전환**: 기존 라이센스와 ExtensionPay 병행 운영
2. **무료 마이그레이션**: 기존 유료 사용자에게 ExtensionPay 계정 무료 제공
3. **공지사항**: 충분한 사전 공지로 사용자 혼란 최소화

이 설정을 통해 라이센스 키 관리의 복잡성 없이 간편하게 확장 프로그램을 수익화할 수 있습니다.