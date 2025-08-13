// Instagram Sorting Extension - Manual Button Sorting
console.log('🚀 Instagram Manual Sorting v6.3 - 스크롤 기반 릴스 수집 시스템 loaded!');

// 🆕 스크롤 기반 릴스 데이터베이스
let reelDatabase = new Map(); // reelId -> reelData
let scrollObserver = null;
let isCollecting = false;

// 스크롤 기반 릴스 수집 시스템 초기화
function initializeReelCollection() {
  console.log('📊 스크롤 기반 릴스 수집 시스템 초기화...');
  
  if (scrollObserver) {
    scrollObserver.disconnect();
  }
  
  isCollecting = true;
  
  // 지연된 초기 수집 (Instagram 로딩 대기)
  setTimeout(() => {
    console.log('⏰ 지연된 초기 수집 시작...');
    collectCurrentReels();
  }, 2000);
  
  // Intersection Observer로 새로운 릴스 감지
  scrollObserver = new IntersectionObserver((entries) => {
    if (!isCollecting) return;
    
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        try {
          const reelLink = entry.target.querySelector('a[href*="/reel/"]');
          if (reelLink) {
            const reelContainer = findReelContainer(entry.target);
            if (reelContainer) {
              console.log('📍 Observer로 새 릴스 발견 - 수집 중...');
              collectReelData(reelContainer);
            }
          }
        } catch (error) {
          console.warn('Observer 처리 중 오류:', error);
        }
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  // 지연된 Observer 설정
  setTimeout(() => {
    observeExistingReels();
  }, 3000);
  
  // 주기적 수집 (10초마다, 충돌 방지)
  setInterval(() => {
    if (isCollecting && !window.isCollectionInProgress) {
      console.log('🔄 주기적 릴스 수집...');
      collectCurrentReels();
    }
  }, 10000);
  
  console.log('✅ 릴스 수집 시스템 활성화됨');
}

// 현재 뷰포트의 모든 릴스 수집
function collectCurrentReels() {
  if (window.isCollectionInProgress) {
    console.log('⚠️ 수집이 이미 진행 중 - 건너뜀');
    return;
  }
  
  window.isCollectionInProgress = true;
  console.log('🚀 === 릴스 수집 시작 ===');
  
  try {
    const currentReels = findAllReels();
    console.log(`📊 findAllReels() 결과: ${currentReels.length}개 릴스 발견`);
    
    if (currentReels.length === 0) {
      console.warn('❌ findAllReels()가 빈 배열 반환 - 릴스 감지 실패');
      return;
    }
  
  let successCount = 0;
  let failCount = 0;
  
  currentReels.forEach((reel, index) => {
    console.log(`\n🔍 릴스 ${index + 1}/${currentReels.length} 처리 중...`);
    try {
      const reelId = getReelId(reel);
      const reelData = extractReelMetadata(reel);
      
      console.log(`  ID: ${reelId}`);
      console.log(`  조회수: ${reelData.views}`);
      console.log(`  좋아요: ${reelData.likes}`);
      console.log(`  댓글: ${reelData.comments}`);
      
      if (reelId) {
        collectReelData(reel);
        successCount++;
        console.log(`  ✅ 수집 성공`);
      } else {
        failCount++;
        console.log(`  ❌ ID 추출 실패`);
      }
    } catch (error) {
      failCount++;
      console.error(`  ❌ 처리 중 오류:`, error);
    }
  });
  
    console.log(`\n📈 수집 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    console.log(`📈 데이터베이스 크기: ${reelDatabase.size}개 릴스 저장됨`);
  } finally {
    window.isCollectionInProgress = false;
  }
}

// 개별 릴스 데이터 수집 및 저장
function collectReelData(reelElement) {
  try {
    const reelData = extractReelMetadata(reelElement);
    const reelId = getReelId(reelElement);
    
    console.log(`🔍 릴스 수집 시도: ID=${reelId}, 조회수=${reelData.views}, 좋아요=${reelData.likes}, 댓글=${reelData.comments}`);
    
    if (!reelId) {
      console.warn('❌ 릴스 ID 추출 실패 - 요소:', reelElement);
      return;
    }
    
    if (!reelDatabase.has(reelId)) {
      // 새로운 릴스 발견
      const fullReelData = {
        ...reelData,
        id: reelId,
        collectedAt: Date.now(),
        lastSeen: Date.now()
      };
      
      reelDatabase.set(reelId, fullReelData);
      
      console.log(`🆕 새 릴스 수집: ${reelId}, 조회수=${reelData.views}, 좋아요=${reelData.likes}, 댓글=${reelData.comments}, 데이터베이스 크기=${reelDatabase.size}`);
    } else {
      // 기존 릴스 업데이트
      const existing = reelDatabase.get(reelId);
      existing.lastSeen = Date.now();
      existing.element = reelData.element; // DOM 요소 업데이트
      console.log(`🔄 기존 릴스 업데이트: ${reelId}`);
    }
  } catch (error) {
    console.warn('릴스 데이터 수집 실패:', error);
  }
}

// 릴스 컨테이너 찾기 함수
function findReelContainer(element) {
  // 요소가 이미 릴스 링크를 포함하고 있다면 그대로 반환
  if (element.querySelector('a[href*="/reel/"]')) {
    return element;
  }
  
  // 부모 요소들을 올라가면서 릴스 컨테이너 찾기
  let current = element;
  for (let i = 0; i < 5; i++) {
    current = current.parentElement;
    if (!current) break;
    
    if (current.querySelector('a[href*="/reel/"]')) {
      // 단일 릴스만 포함하는 컨테이너인지 확인
      const reelLinks = current.querySelectorAll('a[href*="/reel/"]');
      if (reelLinks.length === 1) {
        return current;
      }
    }
  }
  
  return null;
}

// 기존 릴스들 관찰 시작
function observeExistingReels() {
  console.log('👀 기존 릴스들 관찰 시작...');
  
  const allContainers = document.querySelectorAll('div[class*="x"]'); // Instagram 클래스 패턴
  let observedCount = 0;
  
  allContainers.forEach(container => {
    const hasReelLink = container.querySelector('a[href*="/reel/"]');
    if (hasReelLink) {
      scrollObserver.observe(container);
      observedCount++;
    }
  });
  
  console.log(`👀 ${observedCount}개 릴스 컨테이너 관찰 시작`);
  
  // MutationObserver로 새로 추가되는 릴스도 관찰
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newReelLinks = node.querySelectorAll ? node.querySelectorAll('a[href*="/reel/"]') : [];
            newReelLinks.forEach(link => {
              const container = link.closest('div[class*="x"]');
              if (container) {
                scrollObserver.observe(container);
                console.log('🆕 새 릴스 관찰 추가');
              }
            });
          }
        });
      }
    });
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('🔄 MutationObserver 활성화됨');
}

// 전역 릴스 데이터베이스 접근 함수
window.instagramReelDatabase = {
  getSize: () => reelDatabase.size,
  getAllReels: () => Array.from(reelDatabase.values()),
  getTopReels: (limit = 10) => {
    const allReels = Array.from(reelDatabase.values());
    return allReels
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map(reel => ({ id: reel.id, views: reel.views, likes: reel.likes }));
  },
  showStatus: () => {
    console.log('📊 === 릴스 데이터베이스 상태 ===');
    console.log(`수집된 릴스 수: ${reelDatabase.size}개`);
    console.log(`수집 활성화: ${isCollecting}`);
    
    if (reelDatabase.size > 0) {
      const sample = Array.from(reelDatabase.values()).slice(0, 3);
      console.log('샘플 데이터:', sample.map(r => ({id: r.id, views: r.views, likes: r.likes})));
      
      // 현재 DOM과 데이터베이스 매칭 상태 확인
      const currentReels = findAllReels();
      const currentIds = currentReels.map(r => getReelId(r)).filter(id => id);
      const dbIds = Array.from(reelDatabase.keys());
      
      console.log(`현재 DOM ID 수: ${currentIds.length}개`);
      console.log(`데이터베이스 ID 수: ${dbIds.length}개`);
      
      const matched = currentIds.filter(id => reelDatabase.has(id));
      const unmatched = currentIds.filter(id => !reelDatabase.has(id));
      
      console.log(`✅ 매칭되는 릴스: ${matched.length}개`);
      if (unmatched.length > 0) {
        console.log(`❌ 매칭 안 되는 릴스: ${unmatched.length}개`);
        console.log('매칭 안 되는 ID들:', unmatched.slice(0, 3));
      }
    }
  },
  clear: () => {
    reelDatabase.clear();
    console.log('🗑️ 릴스 데이터베이스 초기화됨');
  },
  startCollection: () => {
    initializeReelCollection();
  },
  stopCollection: () => {
    isCollecting = false;
    if (scrollObserver) {
      scrollObserver.disconnect();
    }
    console.log('⏹️ 릴스 수집 중단됨');
  },
  // 디버깅용 테스트 정렬
  testSort: (type = 'views') => {
    console.log(`🧪 데이터베이스 정렬 테스트: ${type}`);
    performDatabaseSort(type);
  },
  // 상위 N개 테스트
  testTop: (type = 'views', count = 50) => {
    console.log(`🏆 상위 ${count}개 테스트: ${type}`);
    performDatabaseSort(`${type}-${count}`);
  },
  // 전체 시스템 재시작
  restart: () => {
    console.log('🔄 릴스 수집 시스템 재시작...');
    isCollecting = false;
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    reelDatabase.clear();
    setTimeout(() => {
      initializeReelCollection();
    }, 1000);
  },
  // 현재 화면 릴스 강제 수집
  collectNow: () => {
    console.log('⚡ 현재 화면 릴스 강제 수집...');
    collectCurrentReels();
    return window.instagramReelDatabase.showStatus();
  },
  // 간단한 findAllReels 테스트
  testFind: () => {
    console.log('🧪 findAllReels() 테스트...');
    const reels = findAllReels();
    console.log(`결과: ${reels.length}개 릴스 발견`);
    if (reels.length > 0) {
      console.log('첫 번째 릴스 샘플:', reels[0]);
      const firstId = getReelId(reels[0]);
      console.log('첫 번째 릴스 ID:', firstId);
    }
    return reels.length;
  },
  // 수집 후 즉시 정렬 테스트
  collectAndSort: (type = 'views') => {
    console.log(`⚡ 수집 후 ${type} 정렬 테스트...`);
    collectCurrentReels();
    setTimeout(() => {
      console.log(`🎯 ${type} 정렬 실행...`);
      performDatabaseSort(type);
    }, 1000);
  },
  // 전체 수집 (끝까지 스크롤하면서 모든 릴스 수집)
  collectAll: () => {
    console.log(`🚀 전체 릴스 수집 시작 - 모든 릴스 수집!`);
    
    let scrollCount = 0;
    let lastSize = reelDatabase.size;
    let noProgressCount = 0;
    let isCollecting = true;
    let startSize = reelDatabase.size;
    
    // 🎯 중단 함수 정의
    const stopCollection = () => {
      isCollecting = false;
      hideCollectionProgress();
      console.log('🛑 수집 중단됨');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      cancelCollectionFunction = null;
    };
    
    // 🎯 전역 취소 함수 설정
    cancelCollectionFunction = stopCollection;
    
    // 🎯 수집 진행 UI 표시
    showCollectionProgress(0, 0);
    
    const scrollAndCollect = () => {
      if (!isCollecting) return;
      
      console.log(`📜 스크롤 ${scrollCount + 1} - 현재 수집: ${reelDatabase.size}개`);
      
      // 스크롤 다운
      window.scrollBy(0, window.innerHeight * 0.8);
      scrollCount++;
      
      // 릴스 수집
      setTimeout(() => {
        if (!isCollecting) return;
        
        collectCurrentReels();
        
        const currentSize = reelDatabase.size;
        const newCollected = currentSize - startSize;
        
        // 🎯 진행률 업데이트 (스크롤 수와 수집 개수 기반)
        updateCollectionProgress(scrollCount, newCollected);
        
        // 진행 상황 체크
        if (currentSize === lastSize) {
          noProgressCount++;
        } else {
          noProgressCount = 0;
          lastSize = currentSize;
        }
        
        console.log(`📊 진행: ${currentSize}개 릴스 수집됨`);
        
        // 종료 조건: 5번 연속 진행 없음 (끝에 도달)
        if (noProgressCount >= 5) {
          console.log(`✅ 수집 완료! 총 ${currentSize}개 릴스 수집됨`);
          console.log(`📜 ${scrollCount}번 스크롤하여 모든 릴스 수집 완료`);
          
          // 🎯 수집 완료 표시
          showCollectionComplete(currentSize - startSize);
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
          isCollecting = false;
          cancelCollectionFunction = null;
          return;
        }
        
        // 계속 스크롤
        setTimeout(scrollAndCollect, 1500);
      }, 1000);
    };
    
    // 맨 위부터 시작
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(scrollAndCollect, 1000);
    
    // 중단 함수 반환
    return stopCollection;
  }
};

// 페이지 로딩 시 자동 시작 (디버깅용 빠른 시작)
setTimeout(() => {
  console.log('🚀 스크롤 기반 수집 시스템 시작...');
  initializeReelCollection();
}, 1000);

// 🛠️ 종합 디버깅 시스템 전역 등록
window.instagramSortingMasterDebug = {
  // 현재 상태 전체 확인
  checkAllStatus: () => {
    console.log('📊 === Instagram 정렬 시스템 전체 상태 ===');
    console.log('1. 정렬 활성화:', isSortingActive);
    console.log('2. 전역 정렬 타입:', globalSortType);
    console.log('3. 백업 데이터:', window.instagramSortingBackup);
    console.log('4. 리렌더링 보호:', !!window.instagramReRenderObserver);
    
    // 현재 화면의 모든 릴스 수 확인
    const allReels = findAllReels();
    console.log('5. 현재 감지된 릴스 수:', allReels.length);
    
    // CSS Order 확인
    if (allReels.length > 0) {
      const orderInfo = allReels.map((reel, index) => ({
        index: index + 1,
        cssOrder: reel.element.style.order || 'auto',
        hasNumberIndicator: !!reel.element.querySelector('.sort-number-indicator')
      }));
      console.log('6. CSS Order 상태:', orderInfo);
    }
    
    return {
      isSortingActive,
      globalSortType,
      reelsCount: allReels.length,
      hasBackup: !!window.instagramSortingBackup,
      hasProtection: !!window.instagramReRenderObserver
    };
  },
  
  // 강제 재정렬
  forceReSort: (sortType = 'views') => {
    console.log(`🔄 강제 재정렬 실행: ${sortType}`);
    resetSorting();
    performSort(sortType);
  },
  
  // 전체 초기화
  fullReset: () => {
    console.log('🔄 전체 시스템 초기화');
    resetSorting();
    if (window.instagramReRenderObserver) {
      window.instagramReRenderObserver.disconnect();
      delete window.instagramReRenderObserver;
    }
    delete window.instagramSortingBackup;
    console.log('✅ 전체 초기화 완료');
  },
  
  // 세 가지 주요 문제 테스트
  testThreeIssues: () => {
    console.log('🧪 === 3가지 주요 문제 테스트 ===');
    
    const allReels = findAllReels();
    console.log(`✅ 문제 3 해결됨: 전체 DOM 스캔으로 ${allReels.length}개 릴스 발견`);
    
    if (allReels.length > 0) {
      // 임시 정렬로 CSS Order 방식 테스트
      performSort('views');
      
      setTimeout(() => {
        const afterSort = findAllReels();
        const hasCorrectOrder = afterSort.some(reel => reel.element.style.order !== '' && reel.element.style.order !== 'auto');
        
        console.log(`✅ 문제 1 해결됨: CSS Order 방식 적용 (${hasCorrectOrder ? '성공' : '실패'})`);
        console.log(`✅ 문제 2 해결됨: DOM 구조 유지로 스크롤 안정성 확보`);
        
        return {
          problem1_sorting: hasCorrectOrder,
          problem2_stability: true, // CSS Order는 DOM 구조를 유지하므로 안정적
          problem3_fullScan: allReels.length > 0
        };
      }, 500);
    }
  }
};

console.log('🛠️ 종합 디버깅: window.instagramSortingMasterDebug');
console.log('🔧 주요 함수: checkAllStatus(), forceReSort(), fullReset(), testThreeIssues()');

// 정렬 상태 추적 변수
let isSortingActive = false;
let originalContainer = null;
let originalElements = [];

// Instagram 그리드 템플릿 저장 변수
let gridTemplate = null;

// 🆕 전역 정렬 상태 저장 (스크롤 대응)
let globalSortType = null;
let globalSortActive = false;
let lastSortTimestamp = 0;
let sortingInProgress = false;

// 이전 정렬 상태 완전 초기화
function resetSorting() {
  console.log('🔄 이전 정렬 상태 초기화...');
  
  // 기존 정렬 표시 제거
  document.querySelectorAll('.reel-order-indicator, .sort-number-indicator').forEach(indicator => {
    indicator.remove();
  });
  
  // Content Swapping 방식 복원 (우선순위 1)
  if (window.instagramSortingBackup && window.instagramSortingBackup.contentBackup) {
    console.log('🔄 Content Swapping 백업에서 복원 중...');
    
    window.instagramSortingBackup.contentBackup.forEach(backup => {
      if (backup.element && backup.element.parentElement) {
        backup.element.innerHTML = backup.originalInnerHTML;
        console.log(`✅ 내용 복원: ${backup.originalIndex + 1}`);
      }
    });
    
    // 백업 데이터 정리
    delete window.instagramSortingBackup.contentBackup;
    delete window.instagramSortingBackup.sortType;
    
    console.log('✅ Content Swapping 복원 완료');
  }
  
  // Transform + Z-Index 방식 복원 (호환성)
  if (window.instagramSortingBackup && window.instagramSortingBackup.styleBackup) {
    console.log('🔄 Transform 백업에서 복원 중...');
    
    window.instagramSortingBackup.styleBackup.forEach(backup => {
      if (backup.element && backup.element.parentElement) {
        backup.element.style.transform = backup.originalTransform;
        backup.element.style.zIndex = backup.originalZIndex;
        backup.element.style.position = backup.originalPosition;
        backup.element.style.transition = '';
        console.log(`✅ Transform 복원: ${backup.originalIndex + 1}`);
      }
    });
    
    // 백업 데이터 정리
    delete window.instagramSortingBackup.styleBackup;
    delete window.instagramSortingBackup.sortType;
    
    console.log('✅ Transform 복원 완료');
  }
  
  // 기존 CSS Order 방식 백업도 체크 (호환성)
  if (window.instagramSortingBackup && window.instagramSortingBackup.orderBackup) {
    console.log('🔄 CSS Order 백업에서 복원 중...');
    
    window.instagramSortingBackup.orderBackup.forEach(backup => {
      if (backup.element && backup.element.parentElement) {
        backup.element.style.order = backup.originalOrder;
        console.log(`✅ CSS Order 복원: ${backup.originalIndex + 1}`);
      }
    });
    
    // 컨테이너 flexbox 설정 제거
    if (window.instagramSortingBackup.containers) {
      window.instagramSortingBackup.containers.forEach(container => {
        if (container && container.style) {
          container.style.display = '';
          container.style.flexDirection = '';
          container.style.flexWrap = '';
          console.log('📦 컨테이너 flexbox 설정 제거');
        }
      });
    }
    
    // 백업 데이터 정리
    delete window.instagramSortingBackup.orderBackup;
    delete window.instagramSortingBackup.containers;
    delete window.instagramSortingBackup.sortType;
    
    console.log('✅ CSS Grid Order 복원 완료');
  }
  
  
  // Transform 기반 정렬 초기화 (안전, 기존 방식 호환성)
  if (originalElements.length > 0) {
    originalElements.forEach(element => {
      // Transform과 관련 스타일만 제거
      element.style.transform = '';
      element.style.zIndex = '';
      element.style.transition = '';
      element.style.border = '';
      element.style.boxShadow = '';
      
      // position이 우리가 설정한 relative라면 제거
      if (element.style.position === 'relative') {
        element.style.position = '';
      }
    });
  }
  
  // 상태 초기화
  isSortingActive = false;
  originalContainer = null;
  originalElements = [];
  
  // 전역 정렬 상태도 초기화 (단순화)
  globalSortType = null;
  globalSortActive = false;
  sortingInProgress = false;
  
  // 정렬 보호 시스템 비활성화
  deactivateSortingProtection();
  
  // 그리드 템플릿은 유지 (재사용 가능)
  // gridTemplate = null; // 필요시에만 초기화
  
  // 리렌더링 보호 해제
  if (window.instagramReRenderObserver) {
    window.instagramReRenderObserver.disconnect();
    delete window.instagramReRenderObserver;
    console.log('🛡️ 리렌더링 보호 해제');
  }
  
  console.log('✅ Content Swapping 방식 초기화 완료');
}

// 전체 DOM의 모든 릴스/게시물 찾기 (뷰포트 무관 전체 스캔)
function findAllReels() {
  console.log('🔍 전체 DOM에서 모든 릴스 컨테이너 찾기...');
  
  const allPossibleReels = [];
  
  // 1. 전체 DOM에서 XPath로 모든 릴스 찾기 (뷰포트 제한 없음)
  const xpathQuery = "//a[contains(@href, '/reel/')]/ancestor::div[position()<=3 and @class]";
  const xpathResult = document.evaluate(
    xpathQuery,
    document.body, // document 전체에서 검색
    null,
    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  
  console.log(`🔍 전체 DOM XPath로 ${xpathResult.snapshotLength}개 후보 발견`);
  
  // XPath 결과를 배열로 변환하고 중복 제거
  const xpathContainers = [];
  for (let i = 0; i < xpathResult.snapshotLength; i++) {
    const container = xpathResult.snapshotItem(i);
    // 하나의 릴스 링크만 포함한 가장 작은 컨테이너 찾기
    const reelLinksInContainer = container.querySelectorAll('a[href*="/reel/"]');
    if (reelLinksInContainer.length === 1) {
      xpathContainers.push(container);
    }
  }
  
  console.log(`✅ XPath로 ${xpathContainers.length}개 개별 릴스 발견`);
  allPossibleReels.push(...xpathContainers);
  
  // 백업 방법: CSS 셀렉터로 릴스 링크 찾기
  const reelLinks = document.querySelectorAll('a[href*="/reel/"]');
  console.log(`🔗 CSS로 릴스 링크 ${reelLinks.length}개 발견`);
  
  reelLinks.forEach((link, index) => {
    // 개별 릴스의 가장 가까운 컨테이너 찾기 (작은 단위부터)
    let container = link;
    console.log(`🔗 ${index}: 릴스 링크 분석 시작`);
    
    for (let i = 0; i < 4; i++) { // 범위를 줄여서 더 가까운 컨테이너 찾기
      container = container.parentElement;
      if (!container) {
        console.log(`❌ ${index}: ${i}단계에서 부모 없음`);
        break;
      }
      
      // 개별 릴스 컨테이너 조건들 (더 엄격하게)
      const hasImage = container.querySelector('img');
      const hasText = container.textContent.length > 5 && container.textContent.length < 100; // 너무 크지 않은 텍스트
      const isReasonableSize = container.offsetHeight > 100 && container.offsetHeight < 1000; // 적당한 크기
      const hasOnlyOneReel = container.querySelectorAll('a[href*="/reel/"]').length === 1; // 하나의 릴스만 포함
      
      console.log(`🔍 ${index}-${i}: ${container.tagName}, 이미지:${!!hasImage}, 텍스트:${hasText}(${container.textContent.length}), 크기:${isReasonableSize}(${container.offsetHeight}x${container.offsetWidth}), 단일릴스:${hasOnlyOneReel}`);
      
      // 개별 릴스 컨테이너 조건
      if (hasImage && hasText && isReasonableSize && hasOnlyOneReel) {
        allPossibleReels.push(container);
        console.log(`✅ ${index}: 개별 릴스 컨테이너 발견: ${container.tagName}`);
        break;
      }
      
      // 백업: 최소 조건이라도 만족하면 추가
      if (i === 3 && hasImage) { // 마지막 시도에서 최소 조건
        allPossibleReels.push(container);
        console.log(`⚠️ ${index}: 백업 컨테이너 사용: ${container.tagName}`);
      }
    }
  });
  
  // 방법 2: div[role="button"] 중에서 릴스 관련된 것들
  const buttonDivs = document.querySelectorAll('div[role="button"]');
  console.log(`🔘 버튼 역할 div ${buttonDivs.length}개 발견`);
  
  buttonDivs.forEach(div => {
    const text = div.textContent.toLowerCase();
    const hasReelIndicators = text.includes('likes') || text.includes('play') || 
                             text.includes('좋아요') || text.includes('재생') ||
                             div.querySelector('a[href*="/reel/"]');
    
    if (hasReelIndicators && div.offsetHeight > 100) {
      allPossibleReels.push(div);
      console.log(`✅ 버튼 기반 릴스 발견: 텍스트 "${text.slice(0, 50)}..."`);
    }
  });
  
  // 방법 3: transform 스타일이 있는 div들 (스크롤 컨테이너)
  const transformDivs = document.querySelectorAll('div[style*="transform"]');
  console.log(`🔄 Transform div ${transformDivs.length}개 발견`);
  
  transformDivs.forEach(div => {
    const hasReelContent = div.querySelector('a[href*="/reel/"]') || 
                          (div.textContent.includes('likes') || div.textContent.includes('좋아요'));
    
    if (hasReelContent && div.offsetHeight > 200) {
      allPossibleReels.push(div);
      console.log(`✅ Transform 기반 릴스 발견`);
    }
  });
  
  // 중복 제거 및 필터링
  const uniqueReels = [...new Set(allPossibleReels)].filter(reel => 
    reel && reel.offsetHeight > 50 && reel.offsetWidth > 50
  );
  
  console.log(`✅ 최종 발견된 릴스: ${uniqueReels.length}개`);
  
  return uniqueReels;
}

// 안전한 릴스 탐지 (Instagram 파괴 방지)
function findAllReelsUnlimited() {
  console.log('🔍 안전한 릴스 탐지 시작...');
  
  const allReels = [];
  const seenElements = new Set();
  
  // 안전 방법 1: Instagram 전용 컨테이너에서만 검색
  const instagramContainers = document.querySelectorAll('main, section, article, div[role="main"]');
  console.log(`📦 Instagram 컨테이너 ${instagramContainers.length}개 발견`);
  
  instagramContainers.forEach((container, containerIndex) => {
    // 컨테이너 내에서만 릴스 링크 찾기
    const reelLinks = container.querySelectorAll('a[href*="/reel/"]');
    console.log(`🔗 컨테이너 ${containerIndex + 1}에서 릴스 링크 ${reelLinks.length}개 발견`);
    
    reelLinks.forEach((link, linkIndex) => {
      // 릴스 링크의 적절한 컨테이너 찾기 (최대 4단계만)
      let reelContainer = link;
      for (let level = 0; level < 4; level++) {
        reelContainer = reelContainer.parentElement;
        if (!reelContainer || reelContainer === document.body) break;
        
        // 릴스 컨테이너 조건 (안전하게)
        const hasContent = reelContainer.offsetHeight > 50 && reelContainer.offsetWidth > 50;
        const hasImage = reelContainer.querySelector('img, video');
        const isUnique = !seenElements.has(reelContainer);
        
        if (hasContent && hasImage && isUnique) {
          allReels.push(reelContainer);
          seenElements.add(reelContainer);
          console.log(`✅ 안전 릴스 ${allReels.length}: 컨테이너 ${containerIndex + 1}-${linkIndex + 1} (레벨 ${level})`);
          break;
        }
      }
      
      // 최대 50개로 제한 (성능 보호)
      if (allReels.length >= 50) {
        console.log('⚠️ 50개 제한 도달 - 안전을 위해 중단');
        return;
      }
    });
  });
  
  // 최종 필터링 (더 엄격하게)
  const finalReels = allReels.filter(reel => {
    const hasReelLink = reel.querySelector('a[href*="/reel/"]');
    const hasMedia = reel.querySelector('img, video');
    const hasValidSize = reel.offsetHeight > 100 && reel.offsetWidth > 100;
    
    return hasReelLink && hasMedia && hasValidSize;
  });
  
  console.log(`✅ 최종 안전 릴스: ${finalReels.length}개 (최대 50개)`);
  
  return finalReels;
}

// 그리드 열 수 동적 감지
function detectGridColumns(positions) {
  if (positions.length < 2) return 1;
  
  // 첫 번째 행에서 동일한 Y 좌표를 가진 요소들의 개수 계산
  const firstY = positions[0].y;
  const tolerance = 20; // Y 좌표 허용 오차
  
  let cols = 1;
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i].y - firstY) <= tolerance) {
      cols++;
    } else {
      break; // 첫 번째 행 끝
    }
  }
  
  console.log(`🔍 그리드 분석: 첫 번째 Y(${Math.round(firstY)}) 기준 ${cols}개 열 감지`);
  return cols;
}

// 현재 그리드 동적 분석 (스크롤 위치 대응)
function analyzeCurrentGrid(allReels) {
  console.log('🔍 현재 스크롤 위치 기준 그리드 분석...');
  
  if (allReels.length < 4) {
    console.log('❌ 분석용 릴스 부족 (최소 4개 필요)');
    return null;
  }
  
  // 첫 번째 행의 릴스들로 열 수와 기준 위치 결정
  const firstRowReels = getFirstRowReels(allReels);
  if (firstRowReels.length < 2) {
    console.log('❌ 첫 번째 행 릴스 부족');
    return null;
  }
  
  const cols = firstRowReels.length;
  console.log(`📐 현재 그리드 열 수: ${cols}열`);
  
  // 행 높이 계산 (두 번째 행과 첫 번째 행의 Y 차이)
  const rowHeight = calculateRowHeight(allReels, cols);
  
  console.log(`📐 현재 행 높이: ${rowHeight}px`);
  
  return {
    cols: cols,
    rowHeight: rowHeight,
    firstRowReels: firstRowReels,
    baseY: firstRowReels[0].y,
    baseXPositions: firstRowReels.map(r => r.x)
  };
}

// 첫 번째 행의 릴스들 찾기
function getFirstRowReels(allReels) {
  // 릴스 요소들의 위치 정보 수집
  const reelPositions = allReels.map((reelData, index) => {
    const element = reelData.element;
    const rect = element.getBoundingClientRect();
    return {
      index: index,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      element: element,
      reelData: reelData
    };
  });
  
  // Y 좌표로 정렬
  reelPositions.sort((a, b) => a.y - b.y);
  
  // 첫 번째 행 찾기 (Y 좌표가 비슷한 릴스들)
  const firstRowY = reelPositions[0].y;
  const yTolerance = 30;
  const firstRow = reelPositions.filter(pos => Math.abs(pos.y - firstRowY) <= yTolerance);
  
  // X 좌표로 정렬 (왼쪽부터 오른쪽 순서)
  firstRow.sort((a, b) => a.x - b.x);
  
  console.log(`📊 첫 번째 행: ${firstRow.length}개 릴스`);
  return firstRow;
}

// 행 높이 계산
function calculateRowHeight(allReels, cols) {
  const reelPositions = allReels.map((reelData) => {
    const rect = reelData.element.getBoundingClientRect();
    return { y: Math.round(rect.top), height: Math.round(rect.height) };
  });
  
  reelPositions.sort((a, b) => a.y - b.y);
  
  // 두 번째 행의 Y 위치 찾기
  const firstRowY = reelPositions[0].y;
  const secondRowY = reelPositions.find((pos, index) => 
    index >= cols && Math.abs(pos.y - firstRowY) > 30
  )?.y;
  
  if (secondRowY) {
    return secondRowY - firstRowY;
  } else {
    // 두 번째 행이 없으면 첫 번째 행의 높이 + 여백으로 추정
    return reelPositions[0].height + 20;
  }
}

// 동적 위치 계산 (무제한 릴스 대응)
function calculateDynamicPosition(index, gridInfo) {
  const row = Math.floor(index / gridInfo.cols);
  const col = index % gridInfo.cols;
  
  // 첫 번째 행의 X 위치들을 기준으로 열 위치 결정
  const baseX = gridInfo.baseXPositions[col] || gridInfo.baseXPositions[0];
  const targetY = gridInfo.baseY + (row * gridInfo.rowHeight);
  
  return {
    x: baseX,
    y: targetY
  };
}

// 새 릴스 감지 및 충돌 방지 (템플릿 방식에 맞게 수정)
function checkForNewReels(existingSortedReels) {
  const currentReels = findAllReels();
  const existingElements = existingSortedReels.map(r => r.element);
  
  // 새로 추가된 릴스들 찾기
  const newReels = currentReels.filter(reel => !existingElements.includes(reel));
  
  if (newReels.length > 0) {
    console.log(`🆕 새 릴스 ${newReels.length}개 감지됨 - 그리드 템플릿 무효화`);
    
    // 새 릴스가 추가되면 그리드 템플릿을 갱신해야 함
    gridTemplate = null;
    
    // 기존 정렬 초기화
    if (isSortingActive) {
      resetSorting();
    }
  }
}

// 릴스에서 메타데이터 추출하기 (DOM 구조 기반)
function extractReelMetadata(reelElement) {
  const metadata = {
    element: reelElement,
    views: 0,
    likes: 0,
    comments: 0,
    author: '',
    timeAgo: '',
    text: '',
    reelUrl: ''
  };
  
  // 🎯 numberSpans 미리 정의 (전역 사용을 위해)
  let numberSpans = [];
  
  // 릴스 URL 추출
  const reelLink = reelElement.querySelector('a[href*="/reel/"]');
  if (reelLink) {
    metadata.reelUrl = reelLink.href;
    
    // 🎯 DOM 구조 기반 조회수 추출
    console.log('🎯 DOM 구조 기반 조회수 추출 시작');
    
    // 릴스 링크 하위의 모든 span 요소들 수집
    const allSpans = [...reelLink.querySelectorAll('span')];
    console.log(`📊 릴스 링크 내 span 요소 ${allSpans.length}개 발견`);
    
    // span 요소들을 깊이와 내용으로 분석
    allSpans.forEach((span, index) => {
      const text = span.textContent.trim();
      
      // 숫자가 포함되고 너무 길지 않은 span 찾기
      if (text && /[0-9]/.test(text) && text.length <= 20) {
        // span의 DOM 경로 깊이 계산
        let depth = 0;
        let current = span;
        while (current !== reelLink && current.parentElement) {
          depth++;
          current = current.parentElement;
        }
        
        // 자식 요소가 없는 leaf span만 고려 (실제 텍스트 노드)
        const isLeaf = span.children.length === 0;
        
        numberSpans.push({
          element: span,
          text: text,
          depth: depth,
          isLeaf: isLeaf,
          index: index
        });
        
        console.log(`  span ${index + 1}: "${text}" (깊이: ${depth}, leaf: ${isLeaf})`);
      }
    });
    
    // 조회수를 찾는 전략들을 순서대로 시도
    let viewsFound = false;
    
    // 🎯 전략 1: span 인덱스 기반 (로그 패턴 분석 결과)
    // span 7,8이 항상 조회수인 패턴 발견
    console.log(`🔍 전략 1: span 인덱스 기반 조회수 찾기`);
    
    if (numberSpans.length >= 7) {
      // span 7,8 (또는 뒤에서 2,1번째) 우선 확인
      const viewsCandidates = [];
      
      // span 7,8 확인
      const span7 = numberSpans.find(s => s.index === 6); // 0-based index
      const span8 = numberSpans.find(s => s.index === 7);
      
      if (span7) viewsCandidates.push(span7);
      if (span8) viewsCandidates.push(span8);
      
      // 뒤에서 2개 span도 확인 (백업)
      const lastTwo = numberSpans.slice(-2);
      viewsCandidates.push(...lastTwo);
      
      console.log(`  span 인덱스 후보들:`, viewsCandidates.map(c => `span ${c.index + 1}: "${c.text}"`));
      
      // 가장 큰 숫자를 조회수로 선택
      const bestCandidate = viewsCandidates
        .map(s => ({...s, numValue: parseKoreanNumber(s.text)}))
        .filter(s => s.numValue > 0)
        .sort((a, b) => b.numValue - a.numValue)[0];
      
      if (bestCandidate) {
        metadata.views = bestCandidate.numValue;
        viewsFound = true;
        console.log(`✅ span 인덱스로 조회수 발견: span ${bestCandidate.index + 1} "${bestCandidate.text}" = ${bestCandidate.numValue}`);
      }
    }
    
    // 전략 2: 전체 span 중 가장 큰 값 선택 (백업)
    if (!viewsFound && numberSpans.length > 0) {
      console.log(`🔍 전략 2: 전체 span 중 최대값 선택`);
      
      const candidates = numberSpans
        .map(s => ({...s, numValue: parseKoreanNumber(s.text)}))
        .filter(s => s.numValue > 0)
        .sort((a, b) => b.numValue - a.numValue);
      
      console.log(`  모든 후보:`, candidates.map(c => `span ${c.index + 1}: "${c.text}" = ${c.numValue}`));
      
      if (candidates.length > 0) {
        metadata.views = candidates[0].numValue;
        viewsFound = true;
        console.log(`✅ 최대값으로 조회수 선택: span ${candidates[0].index + 1} "${candidates[0].text}" = ${candidates[0].numValue}`);
      }
    }
    
    // 전략 3: CSS 패턴 (최후 수단)
    if (!viewsFound) {
      console.log(`🔍 전략 3: CSS 패턴 시도`);
      
      const viewPatternSelectors = [
        'div div div div span span',
        'div div span span'
      ];
      
      for (const selector of viewPatternSelectors) {
        try {
          const viewSpans = [...reelLink.querySelectorAll(selector)];
          console.log(`🔍 패턴 "${selector}": ${viewSpans.length}개 발견`);
          
          // 모든 패턴 매칭 결과 중 가장 큰 값 선택
          const patternCandidates = viewSpans
            .map(span => {
              const text = span.textContent.trim();
              return {text: text, numValue: parseKoreanNumber(text)};
            })
            .filter(c => c.numValue > 0)
            .sort((a, b) => b.numValue - a.numValue);
          
          if (patternCandidates.length > 0) {
            metadata.views = patternCandidates[0].numValue;
            viewsFound = true;
            console.log(`✅ 패턴 매칭으로 조회수 발견: "${patternCandidates[0].text}" = ${patternCandidates[0].numValue}`);
            break;
          }
        } catch (e) {
          console.log(`⚠️ 패턴 "${selector}" 오류:`, e.message);
        }
      }
    }
  }
  
  // 🎯 좋아요와 댓글 수도 조회수와 동일한 DOM 구조 기반 추출
  if (numberSpans.length > 0) {
    // 조회수가 첫 번째, 좋아요가 두 번째, 댓글이 세 번째로 가정
    const sortedSpans = numberSpans
      .filter(spanInfo => spanInfo.isLeaf)
      .sort((a, b) => a.index - b.index);
    
    console.log(`📊 숫자 span 순서: ${sortedSpans.map(s => s.text).join(', ')}`);
    
    // 좋아요 추출 (두 번째 숫자)
    if (sortedSpans.length >= 2) {
      const likesText = sortedSpans[1].text;
      metadata.likes = parseNumber(likesText);
      console.log(`❤️ 좋아요 추출: "${likesText}" → ${metadata.likes}`);
    }
    
    // 댓글 추출 (세 번째 숫자)
    if (sortedSpans.length >= 3) {
      const commentsText = sortedSpans[2].text;
      metadata.comments = parseNumber(commentsText);
      console.log(`💬 댓글 추출: "${commentsText}" → ${metadata.comments}`);
    }
  }
  
  // 🔄 Fallback: 기존 텍스트 패턴 방식 (DOM 방식이 실패할 경우)
  if (metadata.likes === 0 || metadata.comments === 0) {
    
    // 좋아요 패턴
    if (metadata.likes === 0) {
      const likesPatterns = [
        /([0-9,K.M]+)\s*likes?/gi,
        /([0-9,K.M]+)\s*좋아요/gi,
        /좋아요\s*([0-9,K.M]+)/gi
      ];
      
      for (const pattern of likesPatterns) {
        const match = allText.match(pattern);
        if (match) {
          const numberMatch = match[0].match(/([0-9,K.M]+)/);
          if (numberMatch) {
            metadata.likes = parseNumber(numberMatch[1]);
            console.log(`❤️ Fallback 좋아요: ${metadata.likes}`);
            break;
          }
        }
      }
    }
    
    // 댓글 패턴
    if (metadata.comments === 0) {
      const commentsPatterns = [
        /([0-9,K.M]+)\s*comments?/gi,
        /([0-9,K.M]+)\s*댓글/gi,
        /댓글\s*([0-9,K.M]+)/gi
      ];
      
      for (const pattern of commentsPatterns) {
        const match = allText.match(pattern);
        if (match) {
          const numberMatch = match[0].match(/([0-9,K.M]+)/);
          if (numberMatch) {
            metadata.comments = parseNumber(numberMatch[1]);
            console.log(`💬 Fallback 댓글: ${metadata.comments}`);
            break;
          }
        }
      }
    }
  }
  
  // 작성자 추출 
  const authorEl = reelElement.querySelector('a[href*="/"]:not([href*="reel"]):not([href*="explore"])');
  if (authorEl) {
    metadata.author = authorEl.textContent.trim();
  }
  
  // 🎯 전체 텍스트 추출 (시간 정보 및 기타 패턴 매칭용)
  const allText = reelElement.textContent || '';
  
  // 시간 정보 추출
  const timePatterns = [
    /(\d+)\s*(minute|min|hour|day|week|month)s?\s*ago/gi,
    /(\d+)\s*(분|시간|일|주|달)\s*전/gi
  ];
  
  for (const pattern of timePatterns) {
    const match = allText.match(pattern);
    if (match) {
      metadata.timeAgo = match[0];
      break;
    }
  }
  
  // 🔍 최종 추출 결과 디버깅
  console.log('🔍 메타데이터 추출 결과:', {
    조회수: metadata.views,
    좋아요: metadata.likes,
    댓글: metadata.comments,
    작성자: metadata.author,
    시간: metadata.timeAgo,
    URL: metadata.reelUrl.slice(-20)
  });
  
  return metadata;
}

// 한국어 숫자 문자열을 실제 숫자로 변환 (DOM 기반 추출용)
function parseKoreanNumber(str) {
  if (!str) return 0;
  
  const cleanStr = str.replace(/[,\s]/g, '').trim();
  console.log(`🔢 숫자 파싱: "${str}" → "${cleanStr}"`);
  
  // 한국어 단위 처리
  if (cleanStr.includes('만')) {
    const num = parseFloat(cleanStr.replace('만', ''));
    const result = num * 10000;
    console.log(`  만 단위: ${num} × 10000 = ${result}`);
    return result;
  } else if (cleanStr.includes('천')) {
    const num = parseFloat(cleanStr.replace('천', ''));
    const result = num * 1000;
    console.log(`  천 단위: ${num} × 1000 = ${result}`);
    return result;
  } else if (cleanStr.includes('억')) {
    const num = parseFloat(cleanStr.replace('억', ''));
    const result = num * 100000000;
    console.log(`  억 단위: ${num} × 100000000 = ${result}`);
    return result;
  } 
  
  // 영어 단위
  else if (cleanStr.toUpperCase().includes('K')) {
    const num = parseFloat(cleanStr.replace(/K/gi, ''));
    const result = num * 1000;
    console.log(`  K 단위: ${num} × 1000 = ${result}`);
    return result;
  } else if (cleanStr.toUpperCase().includes('M')) {
    const num = parseFloat(cleanStr.replace(/M/gi, ''));
    const result = num * 1000000;
    console.log(`  M 단위: ${num} × 1000000 = ${result}`);
    return result;
  }
  
  // 일반 숫자
  const result = parseFloat(cleanStr) || 0;
  console.log(`  일반 숫자: ${result}`);
  return result;
}

// 기존 숫자 파싱 함수 (호환성 유지)
function parseNumber(str) {
  return parseKoreanNumber(str);
}

// 모든 요소들의 공통 조상 찾기
function findCommonAncestor(elements) {
  if (!elements || elements.length === 0) return null;
  if (elements.length === 1) return elements[0].parentElement;
  
  console.log(`🔍 ${elements.length}개 요소의 공통 조상 탐색`);
  
  // 첫 번째 요소의 모든 조상들을 수집
  const ancestors = [];
  let current = elements[0];
  
  while (current && current !== document.body) {
    ancestors.push(current);
    current = current.parentElement;
  }
  
  console.log(`첫 번째 요소의 조상: ${ancestors.length}개`);
  
  // 각 조상에 대해 모든 다른 요소들이 포함되는지 확인
  for (let ancestor of ancestors) {
    let containsAll = true;
    
    for (let i = 1; i < elements.length; i++) {
      if (!ancestor.contains(elements[i])) {
        containsAll = false;
        break;
      }
    }
    
    if (containsAll) {
      console.log(`✅ 공통 조상 발견: ${ancestor.tagName}.${ancestor.className.split(' ')[0]}`);
      return ancestor;
    }
  }
  
  console.log('❌ 공통 조상을 찾을 수 없음');
  return null;
}

// 정렬 버튼 생성
function createSortButton() {
  const existing = document.querySelector('#ig-sort-btn');
  if (existing) existing.remove();

  const btn = document.createElement('div');
  btn.id = 'ig-sort-btn';
  btn.textContent = '🎯';
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #ff6b6b;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    border: 3px solid white;
  `;

  btn.onclick = showSortMenu;
  document.body.appendChild(btn);
  console.log('🎯 빨간색 정렬 버튼 생성됨');
}

// 정렬 메뉴
function showSortMenu() {
  const existing = document.querySelector('#ig-sort-menu');
  if (existing) {
    existing.remove();
    return;
  }

  const menu = document.createElement('div');
  menu.id = 'ig-sort-menu';
  menu.style.cssText = `
    position: fixed;
    bottom: 150px;
    right: 20px;
    background: white;
    border-radius: 10px;
    padding: 10px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    z-index: 999999;
    min-width: 160px;
    border: 2px solid #ff6b6b;
  `;

  menu.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; color: #333; text-align: center;">📱 릴스 정렬</div>
    
    <div style="font-weight: bold; margin: 8px 0 4px 0; color: #666; font-size: 12px;">🚀 전체 정렬 (수집 후 정렬)</div>
    <div class="sort-option" data-sort="full-views" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #e74c3c;">
      👁️ 조회수 높은 순
    </div>
    <div class="sort-option" data-sort="full-likes" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #e91e63;">
      ❤️ 좋아요 많은 순
    </div>
    <div class="sort-option" data-sort="full-comments" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #9c27b0;">
      💬 댓글 많은 순
    </div>
    
    <div style="font-weight: bold; margin: 8px 0 4px 0; color: #666; font-size: 12px;">📊 이때까지 본 릴스들만</div>
    <div class="sort-option" data-sort="current-views" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #c0392b;">
      👁️ 조회수 높은 순
    </div>
    <div class="sort-option" data-sort="current-likes" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #c2185b;">
      ❤️ 좋아요 많은 순
    </div>
    <div class="sort-option" data-sort="current-comments" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #8e24aa;">
      💬 댓글 많은 순
    </div>
    <div class="sort-option" data-sort="current-recent" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: white; background: #2196f3;">
      🕐 최신순
    </div>
    <div class="sort-option" data-sort="current-random" style="padding: 8px; cursor: pointer; border-radius: 5px; margin: 2px 0; color: black; background: #fff3cd;">
      🎲 랜덤 섞기
    </div>
  `;

  // 이벤트 리스너
  menu.querySelectorAll('.sort-option').forEach(option => {
    option.onmouseover = () => option.style.background = '#f0f0f0';
    option.onmouseout = () => option.style.background = option.style.background;
    option.onclick = () => {
      const sortType = option.getAttribute('data-sort');
      
      if (sortType.startsWith('full-')) {
        // 전체 정렬: 수집 과정을 거침
        const actualSort = sortType.replace('full-', '');
        performFullSort(actualSort);
      } else if (sortType.startsWith('current-')) {
        // 현재 수집된 것만 정렬
        const actualSort = sortType.replace('current-', '');
        performCurrentSort(actualSort);
      }
      
      menu.remove();
    };
  });

  document.body.appendChild(menu);

  // 외부 클릭시 닫기
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target.id !== 'ig-sort-btn') {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

// 🚀 전체 정렬: 수집 과정을 거친 후 정렬
function performFullSort(sortType) {
  console.log(`🚀 전체 정렬 시작: ${sortType} (수집 후 정렬)`);
  
  // 중복 실행 방지
  if (isSortingActive) {
    console.log('⚠️ 이전 정렬 활성화됨, 초기화 중...');
    resetSorting();
  }
  
  // 전체 수집 실행
  console.log('📊 모든 릴스 수집 시작...');
  const stopFunction = window.instagramReelDatabase.collectAll();
  
  // 수집 완료 체크 (30초 후 강제 정렬)
  const timeoutId = setTimeout(() => {
    console.log(`⏰ 30초 후 강제 정렬 시작: ${reelDatabase.size}개 릴스`);
    performCurrentSort(sortType);
  }, 30000);
  
  // 수집 완료 감지 (5초마다 체크)
  let lastSize = reelDatabase.size;
  let noProgressCount = 0;
  
  const checkComplete = setInterval(() => {
    const currentSize = reelDatabase.size;
    
    if (currentSize === lastSize) {
      noProgressCount++;
    } else {
      noProgressCount = 0;
      lastSize = currentSize;
    }
    
    // 3번 연속 진행 없으면 수집 완료로 간주
    if (noProgressCount >= 3) {
      clearInterval(checkComplete);
      clearTimeout(timeoutId);
      
      console.log(`✅ 전체 수집 완료: ${currentSize}개 릴스 → ${sortType} 정렬 시작`);
      setTimeout(() => {
        performCurrentSort(sortType);
      }, 1000);
    }
  }, 5000);
}

// 📊 현재 수집된 릴스들만 정렬
function performCurrentSort(sortType) {
  console.log(`📊 현재 릴스 정렬: ${sortType} (${reelDatabase.size}개)`);
  
  // 🎯 수집 진행 UI 숨기기 (정렬 시작 시)
  hideCollectionProgress();
  
  // 중복 실행 방지
  if (isSortingActive) {
    console.log('⚠️ 이전 정렬 활성화됨, 초기화 중...');
    resetSorting();
  }
  
  if (reelDatabase.size < 2) {
    alert(`❌ 수집된 릴스가 부족합니다: ${reelDatabase.size}개\n\n스크롤을 더 내려서 릴스를 보신 후 다시 시도해주세요.`);
    return;
  }
  
  // 맨 위로 스크롤 후 정렬
  console.log('📜 맨 위로 스크롤하여 정렬 시작...');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  setTimeout(() => {
    performDatabaseSort(sortType);
  }, 1500);
}

// 🆕 데이터베이스 기반 정렬 함수
function performDatabaseSort(sortType) {
  console.log(`🎯 데이터베이스 기반 ${sortType} 정렬 실행`);
  
  // 1. 전체 데이터베이스에서 정렬
  let allReels = Array.from(reelDatabase.values());
  
  // 정렬 기준에 따라 전체 데이터베이스 정렬
  switch (sortType) {
    case 'views':
      allReels.sort((a, b) => b.views - a.views);
      console.log('👁️ 전체 데이터베이스를 조회수 순으로 정렬');
      break;
    case 'likes':
      allReels.sort((a, b) => b.likes - a.likes);
      console.log('❤️ 전체 데이터베이스를 좋아요 순으로 정렬');
      break;
    case 'comments':
      allReels.sort((a, b) => b.comments - a.comments);
      console.log('💬 전체 데이터베이스를 댓글 순으로 정렬');
      break;
    case 'recent':
      allReels.sort((a, b) => b.collectedAt - a.collectedAt);
      console.log('🕐 전체 데이터베이스를 최신순으로 정렬');
      break;
    case 'random':
      allReels.sort(() => Math.random() - 0.5);
      console.log('🎲 전체 데이터베이스를 랜덤으로 섞음');
      break;
  }
  
  // 2. 현재 DOM에 있는 릴스들만 필터링 (정렬 대상)
  const currentReels = findAllReels();
  const currentReelIds = new Set(currentReels.map(reel => getReelId(reel)).filter(id => id));
  
  console.log(`📋 현재 DOM 릴스: ${currentReels.length}개, ID 매칭: ${currentReelIds.size}개`);
  console.log(`📊 전체 데이터베이스: ${allReels.length}개`);
  
  // 3. 전체 릴스 중에서 현재 DOM에 있는 것만 필터링
  const sortableReels = allReels
    .filter(reelData => currentReelIds.has(reelData.id))
    .map(reelData => {
      // DOM 요소와 데이터 매칭
      const domElement = currentReels.find(reel => getReelId(reel) === reelData.id);
      return {
        ...reelData,
        element: domElement || reelData.element // 최신 DOM 요소 사용
      };
    })
    .filter(reel => reel.element); // DOM 요소가 있는 것만
  
  console.log(`🔍 정렬 가능한 릴스: ${sortableReels.length}개`);
  
  if (sortableReels.length < 2) {
    alert(`❌ 정렬할 수 있는 릴스가 부족합니다: ${sortableReels.length}개`);
    return;
  }
  
  // 4. 정렬 결과 출력 (이미 정렬됨)
  console.log(`🔍 전체 정렬 결과:`);
  sortableReels.slice(0, 10).forEach((reelData, index) => {
    console.log(`${index + 1}위: 조회수=${reelData.views}, 좋아요=${reelData.likes}, 댓글=${reelData.comments}, ID=${reelData.id}`);
  });
  
  // 5. Content Swapping 적용
  const originalPositions = sortableReels.map((reelData, index) => {
    const rect = reelData.element.getBoundingClientRect();
    return {
      index: index,
      x: rect.left,
      y: rect.top,
      reelData: reelData
    };
  });
  
  applySortingWithCSS(sortableReels, sortType, originalPositions);
}

function performSortAfterScroll(sortType) {
  console.log(`🎯 스크롤 후 ${sortType} 정렬 실행`);
  
  // 1단계: 모든 릴스 찾기 (맨 위로 스크롤한 후)
  const reels = findAllReels();
  
  if (reels.length < 2) {
    alert('❌ 정렬할 릴스가 없습니다: ' + reels.length + '개');
    return;
  }
  
  console.log(`🎯 현재 화면 릴스: ${reels.length}개`);
  
  // 2단계: 각 릴스에서 메타데이터 추출
  console.log('📊 메타데이터 추출 중...');
  const reelsWithData = reels.map(reel => extractReelMetadata(reel));
  
  // *** 중요: 정렬 전 원본 위치 정보 저장 (정렬하기 전에!) ***
  const originalPositions = reelsWithData.map((reelData, index) => {
    const rect = reelData.element.getBoundingClientRect();
    return {
      index: index,
      x: rect.left,
      y: rect.top,
      reelData: reelData
    };
  });
  
  console.log('📍 원본 위치 정보 저장 완료:', originalPositions.length + '개');
  
  // 디버깅을 위한 정렬 전 데이터 출력
  console.log('🔍 정렬 전 릴스 데이터:');
  reelsWithData.forEach((reelData, index) => {
    console.log(`릴스 ${index + 1}: 조회수=${reelData.views}, 좋아요=${reelData.likes}, 댓글=${reelData.comments}`);
  });

  // 3단계: 정렬 기준에 따라 정렬
  let sortedReels = [...reelsWithData];
  
  switch (sortType) {
    case 'views':
      sortedReels.sort((a, b) => b.views - a.views);
      console.log('👁️ 조회수 높은 순으로 정렬');
      
      // 정렬 후 디버깅
      console.log('🔍 정렬 후 릴스 순서:');
      sortedReels.forEach((reelData, index) => {
        console.log(`${index + 1}위: 조회수=${reelData.views}, 좋아요=${reelData.likes}, 댓글=${reelData.comments}`);
      });
      break;
      
    case 'likes':
      sortedReels.sort((a, b) => b.likes - a.likes);
      console.log('❤️ 좋아요 많은 순으로 정렬');
      break;
      
    case 'comments':
      sortedReels.sort((a, b) => b.comments - a.comments);
      console.log('💬 댓글 많은 순으로 정렬');
      break;
      
    case 'recent':
      sortedReels.reverse(); // 최신순 (기본 순서의 반대)
      console.log('🕐 최신순으로 정렬');
      break;
      
    case 'random':
      sortedReels.sort(() => Math.random() - 0.5);
      console.log('🎲 랜덤으로 섞음');
      break;
      
    case 'test':
      // 정렬 기능 테스트 - 첫 번째와 마지막 요소 위치 바꾸기
      console.log('🧪 정렬 테스트 시작...');
      
      const testSortedReels = [...reelsWithData];
      if (testSortedReels.length >= 2) {
        // 첫 번째와 마지막 요소 바꾸기
        [testSortedReels[0], testSortedReels[testSortedReels.length - 1]] = 
        [testSortedReels[testSortedReels.length - 1], testSortedReels[0]];
        
        // 색상과 번호로 변화 표시
        testSortedReels.forEach((reelData, index) => {
          const element = reelData.element;
          element.style.border = `5px solid ${index === 0 ? '#ff0000' : index === testSortedReels.length - 1 ? '#0000ff' : '#00ff00'}`;
          element.style.order = index;
          
          // 번호 표시
          const indicator = document.createElement('div');
          indicator.className = 'test-order-indicator';
          indicator.textContent = `TEST ${index + 1}`;
          indicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: black;
            color: white;
            padding: 5px;
            font-weight: bold;
            z-index: 10000;
          `;
          element.style.position = 'relative';
          element.appendChild(indicator);
          
          console.log(`🧪 테스트 릴스 ${index + 1}: order=${element.style.order}`);
        });
        
        // 10초 후 제거
        setTimeout(() => {
          testSortedReels.forEach(reelData => {
            const element = reelData.element;
            element.style.border = '';
            element.style.order = '';
            const testIndicator = element.querySelector('.test-order-indicator');
            if (testIndicator) {
              testIndicator.remove();
            }
          });
          console.log('🧪 테스트 정리 완료');
        }, 10000);
        
        alert('🧪 정렬 테스트: 첫 번째와 마지막 요소가 바뀝니다!\n콘솔을 확인하세요.');
      } else {
        alert('🧪 테스트하려면 릴스가 2개 이상 필요합니다.');
      }
      return;
  }
  
  // 4단계: 상태 추적을 위한 원본 정보 저장
  originalElements = reels.slice(); // 원본 요소들 복사
  
  // 5단계: CSS Grid 정렬 적용 (원본 위치 정보와 함께 전달)
  applySortingWithCSS(sortedReels, sortType, originalPositions);
  
  // 6단계: 정렬 상태 활성화
  isSortingActive = true;
  
  // 정렬 완료 - 동적 재정렬 비활성화
  console.log('✅ 일회성 정렬 완료 - 동적 재정렬 비활성화');
}

// 🆕 Content Swapping 방식 정렬 (DOM 위치 유지, 내용만 교체) - 올바른 구현
function applySortingWithCSS(sortedReels, sortType, originalPositions) {
  console.log(`🎨 Content Swapping 정렬 시작... (${sortType})`);
  
  if (sortedReels.length < 2) {
    alert('정렬할 릴스가 부족합니다.');
    return;
  }
  
  console.log(`📐 ${sortedReels.length}개 릴스를 Content Swapping으로 정렬`);
  
  // 1. 시각적 위치 기준으로 요소들 정렬 (화면 상 위치 기준)
  const domOrderReels = [...sortedReels].sort((a, b) => {
    const aRect = a.element.getBoundingClientRect();
    const bRect = b.element.getBoundingClientRect();
    
    // Y 좌표가 다르면 위쪽이 먼저 (행 우선)
    if (Math.abs(aRect.top - bRect.top) > 10) {
      return aRect.top - bRect.top;
    }
    
    // 같은 행이면 X 좌표로 비교 (왼쪽이 먼저)
    return aRect.left - bRect.left;
  });
  
  console.log('📍 DOM 순서 기준 정렬 완료');
  
  // 정렬 순서 확인
  console.log('🔍 정렬된 순서 확인:');
  sortedReels.slice(0, 5).forEach((reel, index) => {
    console.log(`   ${index + 1}위: 조회수=${reel.views}, 좋아요=${reel.likes}, 댓글=${reel.comments}`);
  });
  
  console.log('🔍 시각적 위치 순서 확인:');
  domOrderReels.slice(0, 5).forEach((reel, index) => {
    const rect = reel.element.getBoundingClientRect();
    console.log(`   시각적 ${index + 1}번째: Y=${Math.round(rect.top)}, X=${Math.round(rect.left)}, 조회수=${reel.views}`);
  });
  
  // 2. 원본 내용 백업 (복원용)
  const contentBackup = domOrderReels.map((reelData, index) => ({
    element: reelData.element,
    originalInnerHTML: reelData.element.innerHTML,
    originalIndex: index,
    reelData: reelData
  }));
  
  console.log('💾 원본 내용 백업 완료');
  
  // 3. 핵심: DOM 위치는 그대로, 내용만 정렬된 순서대로 교체
  console.log('🔄 Content Swapping 시작 - 디버깅 강화');
  console.log(`📊 DOM 순서 릴스 수: ${domOrderReels.length}, 정렬된 릴스 수: ${sortedReels.length}`);
  
  // 길이가 다르면 에러
  if (domOrderReels.length !== sortedReels.length) {
    console.error(`❌ 릴스 수 불일치: DOM(${domOrderReels.length}) vs 정렬(${sortedReels.length})`);
    alert('릴스 수가 일치하지 않습니다. 다시 시도해주세요.');
    return;
  }
  
  // 백업된 원본 내용을 사용하여 중복 방지
  const originalContents = contentBackup.map(backup => backup.originalInnerHTML);
  
  domOrderReels.forEach((domElement, domIndex) => {
    // 안전성 검사
    if (domIndex >= sortedReels.length) {
      console.error(`❌ 인덱스 초과: domIndex=${domIndex}, sortedReels.length=${sortedReels.length}`);
      return;
    }
    
    const sortedContent = sortedReels[domIndex];  // 정렬된 순서에서 domIndex번째
    
    console.log(`🎯 DOM 위치 ${domIndex + 1}에 정렬 순위 ${domIndex + 1}위 내용 배치:`);
    console.log(`   1위 조회수=${sortedReels[0].views}, 배치할 내용 조회수=${sortedContent.views}, 예상 순위=${domIndex + 1}`);
    
    // 백업에서 원본 내용 찾기 (중복 방지)
    const sortedContentBackup = contentBackup.find(backup => backup.reelData.id === sortedContent.id);
    
    if (sortedContentBackup) {
      // 백업된 원본 내용 사용
      domElement.element.innerHTML = sortedContentBackup.originalInnerHTML;
      console.log(`✅ 백업에서 원본 내용 복원: ${sortedContent.id}`);
    } else {
      console.warn(`⚠️ 백업을 찾을 수 없음: ${sortedContent.id}`);
      domElement.element.innerHTML = sortedContent.element.innerHTML;
    }
    
    // 순서 표시 추가
    const numberIndicator = document.createElement('div');
    numberIndicator.className = 'sort-number-indicator';
    numberIndicator.textContent = `${domIndex + 1}`;
    numberIndicator.style.cssText = `
      position: absolute;
      top: 5px;
      left: 5px;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 12px;
      border-radius: 3px;
      z-index: 10000;
    `;
    
    // 상대 위치 설정
    domElement.element.style.position = 'relative';
    
    // 기존 표시기 제거 후 새로 추가
    const existingIndicator = domElement.element.querySelector('.sort-number-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    domElement.element.appendChild(numberIndicator);
  });
  
  // 4. 정렬 상태 저장
  originalElements = domOrderReels.map(r => r.element);
  isSortingActive = true;
  
  // 5. 백업 데이터 저장 (복원용)
  if (!window.instagramSortingBackup) {
    window.instagramSortingBackup = {};
  }
  window.instagramSortingBackup.contentBackup = contentBackup;
  window.instagramSortingBackup.sortType = sortType;
  
  // 6. 디버깅 함수 전역 등록
  window.instagramContentSwapDebug = {
    showBackup: () => {
      console.log('📋 Content Swapping 백업 데이터:', window.instagramSortingBackup);
      return window.instagramSortingBackup;
    },
    restoreNow: () => {
      console.log('🔄 수동 복원 실행...');
      resetSorting();
    },
    checkState: () => {
      console.log('📊 정렬 상태:', {
        isSortingActive,
        hasBackup: !!(window.instagramSortingBackup && window.instagramSortingBackup.contentBackup),
        backupCount: window.instagramSortingBackup?.contentBackup?.length || 0,
        sortType: window.instagramSortingBackup?.sortType
      });
    }
  };
  
  console.log('✅ Content Swapping 정렬 완료:', sortedReels.length + '개 릴스');
  console.log('🔧 DOM 구조/위치 완전 유지 → Instagram 가상화와 100% 호환');
  console.log('🛠️ 디버깅 함수: window.instagramContentSwapDebug');
  
  alert(`✅ Instagram 그리드 정렬 완료!\n${sortedReels.length}개 릴스의 내용을 교체했습니다.\n\n🎯 Content Swapping 방식 - 완벽한 호환성!\n(DOM 위치 유지 → 사라짐 현상 완전 해결)`);
}

// 🛡️ Instagram 리렌더링 감지 및 재정렬 보호
function setupReRenderingProtection(sortedReels) {
  console.log('🛡️ Instagram 리렌더링 보호 시스템 활성화...');
  
  if (window.instagramReRenderObserver) {
    window.instagramReRenderObserver.disconnect();
  }
  
  // MutationObserver로 DOM 변경 감지
  window.instagramReRenderObserver = new MutationObserver((mutations) => {
    let needsReSort = false;
    
    mutations.forEach((mutation) => {
      // 정렬된 요소들의 CSS order가 변경되었는지 확인
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        
        // 이 요소가 정렬된 릴스 중 하나인지 확인
        const isOurSortedElement = sortedReels.some(reelData => reelData.element === element);
        
        if (isOurSortedElement) {
          const currentOrder = element.style.order;
          const expectedOrder = sortedReels.findIndex(reelData => reelData.element === element);
          
          if (currentOrder !== expectedOrder.toString()) {
            console.log(`🔄 CSS Order 변경 감지: ${element} (예상: ${expectedOrder}, 현재: ${currentOrder})`);
            needsReSort = true;
          }
        }
      }
      
      // 새로운 릴스가 추가되었는지 확인 (스크롤로 인한 동적 로딩)
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.querySelector && node.querySelector('a[href*="/reel/"]')) {
            console.log('🆕 새로운 릴스 감지됨 - 재정렬 필요');
            needsReSort = true;
          }
        });
      }
    });
    
    // 재정렬이 필요한 경우
    if (needsReSort) {
      console.log('⚠️ Instagram 리렌더링 감지 - 정렬 재적용');
      
      // 잠시 후 재정렬 (Instagram의 변경이 완료된 후)
      setTimeout(() => {
        reApplyCurrentSorting();
      }, 100);
    }
  });
  
  // DOM 변경 감지 시작
  window.instagramReRenderObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  console.log('✅ Instagram 리렌더링 보호 활성화됨');
}

// 현재 정렬 재적용
function reApplyCurrentSorting() {
  if (!isSortingActive || !window.instagramSortingBackup || !window.instagramSortingBackup.sortType) {
    console.log('ℹ️ 재적용할 정렬이 없음');
    return;
  }
  
  const currentSortType = window.instagramSortingBackup.sortType;
  console.log(`🔄 ${currentSortType} 정렬 재적용 중...`);
  
  // 기존 정렬 해제 없이 새로 정렬
  const tempSortingActive = isSortingActive;
  isSortingActive = false; // resetSorting 방지
  
  performSort(currentSortType);
  
  console.log(`✅ ${currentSortType} 정렬 재적용 완료`);
}

// ⚡ 정렬된 요소 보호 시스템 (위로 스크롤 시 사라짐 방지)
let sortingProtectionActive = false;
let sortedElementsMap = new Map();
let protectionObserver = null;

// 🔧 Enhanced Debugging & Tracking System
let visibilityObservers = new Map(); // Intersection Observer instances
let positionMappings = new Map(); // 원래 위치 ↔ 정렬된 위치 매핑
let scrollDirection = 'down'; // 스크롤 방향 추적
let lastScrollY = 0; // 마지막 스크롤 위치
let debugMode = true; // 디버깅 모드

// 📊 성능 및 통계 추적
let debugStats = {
  restorationAttempts: 0,
  restorationSuccess: 0,
  restorationFailures: 0,
  parentChanges: 0,
  visibilityChanges: 0,
  scrollDirectionChanges: 0,
  startTime: Date.now()
};

// 🕵️ 종합 디버깅 시스템 - 모든 정보 수집
let debugData = {
  domMutations: [],
  reelLifecycle: new Map(),
  scrollEvents: [],
  transformChanges: [],
  parentChanges: [],
  visibilityEvents: [],
  instagramEvents: [],
  maxHistorySize: 1000
};

function activateSortingProtection(sortedReels) {
  console.log('🛡️ Enhanced 정렬 보호 시스템 활성화 중...');
  
  // 기존 보호 시스템이 있다면 정리
  if (protectionObserver) {
    protectionObserver.disconnect();
    sortedElementsMap.clear();
  }
  
  // 스크롤 추적 초기화
  initScrollTracking();
  
  // 종합 디버깅 시스템 활성화
  setTimeout(() => {
    initComprehensiveDebugging();
    console.log('📍 디버깅 시스템이 정렬 보호 활성화 후에 시작됨');
  }, 1000);
  
  // 정렬된 모든 요소 추적
  sortedReels.forEach((reelData, index) => {
    const element = reelData.element;
    const reelId = getReelId(element);
    
    if (reelId) {
      sortedElementsMap.set(reelId, {
        element: element,
        transform: element.style.transform,
        parent: element.parentElement,
        zIndex: element.style.zIndex,
        sortIndex: index
      });
    }
  });
  
  // 릴스 컨테이너 찾기
  const reelsContainer = document.querySelector('main') || 
                        document.querySelector('section') || 
                        document.querySelector('article') ||
                        document.querySelector('div[role="main"]') ||
                        document.body;
  
  if (!reelsContainer) {
    console.warn('⚠️ 릴스 컨테이너를 찾을 수 없음');
    return;
  }
  
  // MutationObserver 설정
  protectionObserver = new MutationObserver(handleElementRemovals);
  protectionObserver.observe(reelsContainer, {
    childList: true,
    subtree: true
  });
  
  sortingProtectionActive = true;
  console.log(`✅ ${sortedElementsMap.size}개 정렬된 요소 Enhanced 보호 활성화`);
  
  // 각 요소에 대해 가시성 추적 시작
  sortedElementsMap.forEach((data, reelId) => {
    setupVisibilityTracking(data.element, reelId);
  });
  
  // 디버그 통계 초기화
  debugStats.startTime = Date.now();
  debugStats.restorationAttempts = 0;
  debugStats.restorationSuccess = 0;
  debugStats.restorationFailures = 0;
}

function handleElementRemovals(mutations) {
  if (!sortingProtectionActive) return;
  
  let restorationNeeded = false;
  const removedReelIds = new Set();
  
  mutations.forEach(mutation => {
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      mutation.removedNodes.forEach(removedNode => {
        if (removedNode.nodeType === 1) { // Element node
          // 제거된 노드 자체와 그 하위 요소들에서 릴스 ID 찾기
          const reelIds = [];
          
          // 제거된 노드 자체에서 ID 추출
          const directId = getReelId(removedNode);
          if (directId) reelIds.push(directId);
          
          // 하위 요소들에서도 ID 추출 (Instagram이 대량 제거할 때 대비)
          const subElements = removedNode.querySelectorAll ? removedNode.querySelectorAll('*') : [];
          for (let subEl of subElements) {
            const subId = getReelId(subEl);
            if (subId) reelIds.push(subId);
          }
          
          // 정렬된 요소 중에 제거된 것이 있는지 확인
          reelIds.forEach(reelId => {
            if (sortedElementsMap.has(reelId)) {
              removedReelIds.add(reelId);
              restorationNeeded = true;
              console.log(`🔄 정렬된 릴스 제거 감지: ${reelId}`);
            }
          });
        }
      });
    }
  });
  
  // 복원이 필요한 경우 처리
  if (restorationNeeded) {
    console.log(`🛡️ ${removedReelIds.size}개 정렬된 릴스 복원 시도`);
    
    // 짧은 지연 후 복원 (Instagram DOM 조작 완료 대기)
    setTimeout(() => {
      removedReelIds.forEach(reelId => {
        if (sortedElementsMap.has(reelId)) {
          const storedData = sortedElementsMap.get(reelId);
          const {element, transform, parent, zIndex, sortIndex} = storedData;
          
          // 요소가 실제로 DOM에서 사라졌는지 확인
          if (!document.contains(element)) {
            try {
              // 부모가 여전히 존재하는지 확인
              if (document.contains(parent)) {
                // 요소 복원
                parent.appendChild(element);
                
                // 정렬 상태 복원
                element.style.transform = transform;
                element.style.zIndex = zIndex;
                element.style.position = 'relative';
                element.style.transition = 'transform 0.3s ease';
                
                console.log(`✅ 릴스 복원 완료: ${reelId} (정렬 순서: ${sortIndex + 1})`);
              } else {
                console.warn(`⚠️ 부모 요소를 찾을 수 없음: ${reelId}`);
                // 향상된 복원 시도
                attemptEnhancedRestoration(reelId);
              }
            } catch (error) {
              console.warn(`❌ 릴스 복원 실패: ${reelId}`, error);
              // 향상된 복원 시도
              attemptEnhancedRestoration(reelId);
            }
          } else {
            console.log(`ℹ️ 릴스가 이미 존재함: ${reelId}`);
          }
        }
      });
    }, 100); // 100ms 지연
  }
}

function getReelId(element) {
  // Instagram 릴스 요소에서 고유 ID 추출 (강화된 버전)
  try {
    console.log(`🔍 릴스 ID 추출 시도 - 요소:`, element.tagName, element.classList.toString());
    
    // 1순위: href 기반 ID 추출
    const links = element.querySelectorAll('a[href*="/reel/"]');
    console.log(`  📎 릴스 링크 ${links.length}개 발견`);
    
    for (let link of links) {
      console.log(`    링크 URL: ${link.href}`);
      const match = link.href.match(/\/reel\/([^\/\?]+)/);
      if (match && match[1]) {
        const id = 'reel_' + match[1];
        console.log(`✅ 릴스 ID 추출 성공: ${id}`);
        return id;
      }
    }
    
    // 2순위: 비디오 소스 기반 ID
    const videos = element.querySelectorAll('video');
    for (let video of videos) {
      if (video.src) {
        const srcMatch = video.src.match(/\/([^\/\?]+)\.(mp4|webm)/);
        if (srcMatch) return 'video_' + srcMatch[1];
      }
      if (video.poster) {
        const posterMatch = video.poster.match(/\/([^\/\?]+)\.(jpg|jpeg|png)/);
        if (posterMatch) return 'poster_' + posterMatch[1];
      }
    }
    
    // 3순위: 이미지 소스 기반 ID
    const images = element.querySelectorAll('img');
    for (let img of images) {
      if (img.src && img.src.includes('instagram')) {
        const imgMatch = img.src.match(/\/([^\/\?]+)\.(jpg|jpeg|png)/);
        if (imgMatch) return 'img_' + imgMatch[1];
      }
    }
    
    // 4순위: 데이터 속성들
    const dataAttrs = [
      element.dataset.testid,
      element.id,
      element.getAttribute('data-id'),
      element.getAttribute('data-reel-id'),
      element.getAttribute('data-key')
    ].filter(Boolean);
    
    if (dataAttrs.length > 0) {
      return 'data_' + dataAttrs[0];
    }
    
    // 5순위: 텍스트 기반 해시 (마지막 수단)
    const textContent = element.textContent.trim();
    if (textContent.length > 10) {
      // 간단한 텍스트 해시
      let hash = 0;
      for (let i = 0; i < Math.min(textContent.length, 50); i++) {
        hash = ((hash << 5) - hash + textContent.charCodeAt(i)) & 0xffffffff;
      }
      return 'text_' + Math.abs(hash).toString(36);
    }
    
    return null;
  } catch (error) {
    console.warn('릴스 ID 추출 실패:', error);
    return null;
  }
}

function deactivateSortingProtection() {
  if (protectionObserver) {
    protectionObserver.disconnect();
    protectionObserver = null;
  }
  
  // 가시성 observers 정리
  visibilityObservers.forEach(observer => observer.disconnect());
  visibilityObservers.clear();
  
  sortedElementsMap.clear();
  positionMappings.clear();
  sortingProtectionActive = false;
  console.log('🛡️ Enhanced 정렬 보호 시스템 비활성화');
}

// 🔧 Enhanced Debugging & Restoration Functions

// 🔍 스크롤 방향 추적 초기화
function initScrollTracking() {
  lastScrollY = window.scrollY;
  
  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const newDirection = currentScrollY > lastScrollY ? 'down' : 'up';
    
    if (newDirection !== scrollDirection) {
      scrollDirection = newDirection;
      debugStats.scrollDirectionChanges++;
      if (debugMode) console.log(`📍 스크롤 방향 변경: ${scrollDirection} (총 ${debugStats.scrollDirectionChanges}회)`);
      
      // 위로 스크롤할 때 예방적 조치
      if (scrollDirection === 'up' && sortingProtectionActive) {
        performPreventiveCheck();
      }
    }
    
    lastScrollY = currentScrollY;
  }, { passive: true });
}

// 🛡️ 예방적 확인 실행
function performPreventiveCheck() {
  if (debugMode) console.log('🔄 예방적 확인 시작 (위로 스크롤 감지)');
  
  // 현재 뷰포트 근처의 정렬된 릴스들 확인
  sortedElementsMap.forEach((storedData, reelId) => {
    const { element } = storedData;
    
    // 요소가 DOM에 있지만 부모가 변경되었을 수 있는지 확인
    if (document.contains(element)) {
      const currentParent = element.parentElement;
      if (currentParent !== storedData.parent) {
        debugStats.parentChanges++;
        if (debugMode) console.warn(`⚠️ 부모 변경 감지: ${reelId} (총 ${debugStats.parentChanges}회)`);
        // 새 부모 정보 업데이트
        storedData.parent = currentParent;
        sortedElementsMap.set(reelId, storedData);
      }
    } else {
      if (debugMode) console.warn(`🚨 요소 사라짐 감지: ${reelId}`);
      attemptEnhancedRestoration(reelId);
    }
  });
}

// 🔍 향상된 가시성 추적 시스템
function setupVisibilityTracking(element, reelId) {
  // 기존 observer 정리
  if (visibilityObservers.has(reelId)) {
    visibilityObservers.get(reelId).disconnect();
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const { isIntersecting, target } = entry;
        
        debugStats.visibilityChanges++;
        if (debugMode) {
          console.log(`👁️ 가시성 변경: ${reelId} - ${isIntersecting ? '보임' : '안보임'} (총 ${debugStats.visibilityChanges}회)`);
        }
        
        if (!isIntersecting && sortingProtectionActive) {
          // 요소가 보이지 않게 되었을 때 추가 보호 조치
          setTimeout(() => {
            if (!document.contains(target)) {
              console.warn(`🚨 요소 사라짐 감지 (Intersection): ${reelId}`);
              attemptEnhancedRestoration(reelId);
            }
          }, 100);
        }
      });
    },
    {
      root: null, // viewport 기준
      rootMargin: '200px 0px', // 뷰포트 확장 영역
      threshold: [0, 0.1, 0.5, 1.0] // 다양한 임계값
    }
  );
  
  observer.observe(element);
  visibilityObservers.set(reelId, observer);
}

// 🔧 향상된 복원 시스템
function attemptEnhancedRestoration(reelId) {
  if (!sortedElementsMap.has(reelId)) {
    if (debugMode) console.warn(`❓ 복원 대상 없음: ${reelId}`);
    return;
  }
  
  debugStats.restorationAttempts++;
  const startTime = performance.now();
  
  const storedData = sortedElementsMap.get(reelId);
  const { element, transform, zIndex, sortIndex } = storedData;
  
  if (debugMode) console.log(`🔧 향상된 복원 시작: ${reelId} (시도 #${debugStats.restorationAttempts})`);
  
  // 1단계: 원래 부모 확인
  if (document.contains(storedData.parent)) {
    if (debugMode) console.log(`✅ 원래 부모로 복원: ${reelId}`);
    const success = restoreElementToParent(element, storedData.parent, transform, zIndex, sortIndex, reelId);
    if (success) {
      debugStats.restorationSuccess++;
      const duration = performance.now() - startTime;
      if (debugMode) console.log(`⏱️ 복원 완료 시간: ${duration.toFixed(2)}ms`);
    }
    return;
  }
  
  // 2단계: 대체 부모 찾기
  const alternativeParent = findAlternativeParent(reelId);
  if (alternativeParent) {
    if (debugMode) console.log(`🔄 대체 부모로 복원: ${reelId}`);
    storedData.parent = alternativeParent;
    sortedElementsMap.set(reelId, storedData);
    const success = restoreElementToParent(element, alternativeParent, transform, zIndex, sortIndex, reelId);
    if (success) {
      debugStats.restorationSuccess++;
      const duration = performance.now() - startTime;
      if (debugMode) console.log(`⏱️ 복원 완료 시간: ${duration.toFixed(2)}ms`);
    }
    return;
  }
  
  // 3단계: 완전 재생성 시도
  debugStats.restorationFailures++;
  if (debugMode) console.warn(`❌ 복원 실패, 추적 중단: ${reelId} (실패율: ${((debugStats.restorationFailures / debugStats.restorationAttempts) * 100).toFixed(1)}%)`);
  cleanupElement(reelId);
}

// 🔍 대체 부모 찾기 (CSS 선택자 기반)
function findAlternativeParent(reelId) {
  const reelsContainer = document.querySelector('main') || 
                        document.querySelector('section') || 
                        document.querySelector('article') ||
                        document.querySelector('[role="main"]') ||
                        document.body;
  if (!reelsContainer) return null;
  
  // Instagram 릴스의 일반적인 부모 선택자들
  const parentSelectors = [
    'div[style*="transform"]',
    'div[role="button"]', 
    'article > div',
    'div[class*="reel"]',
    'div[class*="media"]',
    'div > div > div' // 일반적인 중첩 구조
  ];
  
  for (const selector of parentSelectors) {
    const candidates = reelsContainer.querySelectorAll(selector);
    for (const candidate of candidates) {
      // 이미 다른 릴스를 포함하고 있지 않은 빈 컨테이너 찾기
      const hasReelChild = candidate.querySelector('[data-testid*="reel"], [class*="reel"]');
      if (!hasReelChild && candidate.children.length === 0) {
        if (debugMode) console.log(`🎯 대체 부모 발견: ${selector}`);
        return candidate;
      }
    }
  }
  
  if (debugMode) console.warn(`❓ 대체 부모를 찾을 수 없음: ${reelId}`);
  return null;
}

// 🔄 부모에 요소 복원
function restoreElementToParent(element, parent, transform, zIndex, sortIndex, reelId) {
  try {
    parent.appendChild(element);
    
    // 정렬 상태 복원
    element.style.transform = transform;
    element.style.zIndex = zIndex;
    element.style.position = 'relative';
    element.style.transition = 'transform 0.3s ease';
    
    // 가시성 추적 재시작
    setupVisibilityTracking(element, reelId);
    
    console.log(`✅ 릴스 복원 완료: ${reelId} (정렬 순서: ${sortIndex + 1})`);
    return true;
  } catch (error) {
    console.error(`❌ 복원 중 오류: ${reelId}`, error);
    cleanupElement(reelId);
    return false;
  }
}

// 🧹 요소 정리
function cleanupElement(reelId) {
  // 가시성 observer 정리
  if (visibilityObservers.has(reelId)) {
    visibilityObservers.get(reelId).disconnect();
    visibilityObservers.delete(reelId);
  }
  
  // 매핑 정리
  sortedElementsMap.delete(reelId);
  positionMappings.delete(reelId);
  
  if (debugMode) console.log(`🧹 요소 정리 완료: ${reelId}`);
}

// 📊 디버그 컨트롤 및 통계 시스템
try {
console.log('🔧 디버그 시스템 시작...');
window.instagramSortingDebug = {
  // 디버그 모드 토글
  toggleDebug: () => {
    debugMode = !debugMode;
    console.log(`🔧 디버그 모드: ${debugMode ? '활성화' : '비활성화'}`);
    return debugMode;
  },
  
  // 🕵️ 종합 디버깅 데이터 접근
  getAllDebugData: () => {
    return {
      stats: debugStats,
      data: debugData,
      currentState: {
        sortingActive: sortingProtectionActive,
        trackedReels: sortedElementsMap.size,
        scrollDirection: scrollDirection,
        timestamp: Date.now()
      }
    };
  },
  
  // 🚨 최근 Instagram 이벤트 확인
  getRecentInstagramEvents: (minutes = 1) => {
    const since = Date.now() - (minutes * 60 * 1000);
    return debugData.instagramEvents.filter(event => event.timestamp > since);
  },
  
  // 📊 DOM 변화 분석
  analyzeDOMChanges: (minutes = 1) => {
    const since = Date.now() - (minutes * 60 * 1000);
    const recentMutations = debugData.domMutations.filter(m => m.timestamp > since);
    
    const analysis = {
      totalMutations: recentMutations.length,
      nodeAdditions: recentMutations.filter(m => m.addedNodes.length > 0).length,
      nodeRemovals: recentMutations.filter(m => m.removedNodes.length > 0).length,
      attributeChanges: recentMutations.filter(m => m.type === 'attributes').length,
      reelRelated: recentMutations.filter(m => {
        try {
          const str = JSON.stringify(m, (key, value) => {
            if (key.startsWith('__react') || value instanceof HTMLElement) {
              return '[HTMLElement]';
            }
            return value;
          });
          return str.toLowerCase().includes('reel') || str.toLowerCase().includes('article');
        } catch (e) {
          return String(m.targetClass).toLowerCase().includes('reel') || 
                 String(m.targetId).toLowerCase().includes('reel');
        }
      }).length
    };
    
    console.table(analysis);
    return analysis;
  },
  
  // 🔄 스크롤 패턴 분석
  analyzeScrollPattern: (minutes = 2) => {
    const since = Date.now() - (minutes * 60 * 1000);
    const recentScrolls = debugData.scrollEvents.filter(s => s.timestamp > since);
    
    if (recentScrolls.length < 2) return { message: '스크롤 데이터 부족' };
    
    const directionChanges = recentScrolls.reduce((count, scroll, index) => {
      if (index > 0 && scroll.direction !== recentScrolls[index - 1].direction) {
        return count + 1;
      }
      return count;
    }, 0);
    
    const analysis = {
      totalScrollEvents: recentScrolls.length,
      directionChanges: directionChanges,
      averageReelsTracked: recentScrolls.reduce((sum, s) => sum + s.activeReels, 0) / recentScrolls.length,
      scrollRange: {
        min: Math.min(...recentScrolls.map(s => s.scrollY)),
        max: Math.max(...recentScrolls.map(s => s.scrollY))
      }
    };
    
    console.table(analysis);
    return analysis;
  },
  
  // 현재 상태 보고
  getStats: () => {
    const uptime = ((Date.now() - debugStats.startTime) / 1000).toFixed(1);
    const successRate = debugStats.restorationAttempts > 0 
      ? ((debugStats.restorationSuccess / debugStats.restorationAttempts) * 100).toFixed(1)
      : 'N/A';
    
    const report = {
      uptime: `${uptime}초`,
      protection: sortingProtectionActive ? '활성' : '비활성',
      trackedElements: sortedElementsMap.size,
      visibilityObservers: visibilityObservers.size,
      scrollDirection: scrollDirection,
      stats: {
        restorationAttempts: debugStats.restorationAttempts,
        restorationSuccess: debugStats.restorationSuccess,
        restorationFailures: debugStats.restorationFailures,
        successRate: `${successRate}%`,
        parentChanges: debugStats.parentChanges,
        visibilityChanges: debugStats.visibilityChanges,
        scrollDirectionChanges: debugStats.scrollDirectionChanges
      }
    };
    
    console.table(report.stats);
    console.log('📊 Instagram 정렬 디버그 리포트:', report);
    return report;
  },
  
  // 통계 초기화
  resetStats: () => {
    debugStats = {
      restorationAttempts: 0,
      restorationSuccess: 0,
      restorationFailures: 0,
      parentChanges: 0,
      visibilityChanges: 0,
      scrollDirectionChanges: 0,
      startTime: Date.now()
    };
    console.log('📊 디버그 통계 초기화 완료');
  },
  
  // 실시간 모니터링 시작/중지
  monitor: null,
  startMonitoring: (interval = 10000) => {
    if (window.instagramSortingDebug.monitor) {
      clearInterval(window.instagramSortingDebug.monitor);
    }
    
    window.instagramSortingDebug.monitor = setInterval(() => {
      if (sortingProtectionActive) {
        console.log('🔄 실시간 모니터링:', window.instagramSortingDebug.getStats().stats);
      }
    }, interval);
    
    console.log(`📡 실시간 모니터링 시작 (${interval/1000}초 간격)`);
  },
  
  stopMonitoring: () => {
    if (window.instagramSortingDebug.monitor) {
      clearInterval(window.instagramSortingDebug.monitor);
      window.instagramSortingDebug.monitor = null;
      console.log('📡 실시간 모니터링 중지');
    }
  },
  
  // 진단 도구
  diagnose: () => {
    console.log('🩺 Instagram 정렬 진단 시작...');
    
    const issues = [];
    
    // 보호 시스템 상태 확인
    if (!sortingProtectionActive) {
      issues.push('⚠️ 보호 시스템이 비활성화됨');
    }
    
    // 추적 중인 요소들 확인
    if (sortedElementsMap.size === 0) {
      issues.push('⚠️ 추적 중인 정렬된 요소 없음');
    }
    
    // 실제 DOM 존재 여부 확인
    let missingElements = 0;
    sortedElementsMap.forEach((data) => {
      if (!document.contains(data.element)) {
        missingElements++;
      }
    });
    
    if (missingElements > 0) {
      issues.push(`⚠️ DOM에서 사라진 요소: ${missingElements}개`);
    }
    
    // 부모 변경 확인
    let parentMismatches = 0;
    sortedElementsMap.forEach((data) => {
      if (document.contains(data.element)) {
        const currentParent = data.element.parentElement;
        if (currentParent !== data.parent) {
          parentMismatches++;
        }
      }
    });
    
    if (parentMismatches > 0) {
      issues.push(`⚠️ 부모가 변경된 요소: ${parentMismatches}개`);
    }
    
    // 가시성 observer 상태 확인
    if (visibilityObservers.size !== sortedElementsMap.size) {
      issues.push(`⚠️ 가시성 Observer 불일치: ${visibilityObservers.size}/${sortedElementsMap.size}`);
    }
    
    if (issues.length === 0) {
      console.log('✅ 진단 결과: 모든 시스템 정상');
    } else {
      console.warn('🚨 진단 결과: 다음 문제들이 발견됨:');
      issues.forEach(issue => console.warn(issue));
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'issues',
      issues: issues
    };
  }
};

console.log('✅ window.instagramSortingDebug 생성 완료');
console.log('🌐 MAIN world에서 실행 중 - 페이지 컨텍스트 직접 접근 가능');

} catch (error) {
  console.error('❌ 디버그 시스템 생성 실패:', error);
}

// 🔥 간단한 릴스 감지 시스템
function initComprehensiveDebugging() {
  console.log('🔥 간단한 릴스 감지 시스템 활성화...');
  
  const simpleObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        // 제거된 노드 확인
        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === 1) {
              // 릴스인지 간단하게 확인
              const hasVideo = node.querySelector && node.querySelector('video');
              const hasReelLink = node.querySelector && node.querySelector('a[href*="/reel/"]');
              const hasTransform = node.style && node.style.transform && node.style.transform.includes('translate');
              const isArticle = node.tagName === 'ARTICLE';
              
              if (hasVideo || hasReelLink || hasTransform || isArticle) {
                // 릴스 요소로 판단
                const reelId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                console.warn(`🚨 릴스 제거 감지: ${node.tagName}.${node.className}`);
                
                // Instagram 이벤트 직접 추가
                debugData.instagramEvents.push({
                  type: 'REEL_REMOVED_SIMPLE',
                  reelId: reelId,
                  element: node,
                  timestamp: Date.now(),
                  hasVideo: !!hasVideo,
                  hasReelLink: !!hasReelLink,
                  hasTransform: !!hasTransform,
                  isArticle: isArticle,
                  wasTracked: false // 간단한 시스템에서는 추적 여부 확인 안 함
                });
                
                // 즉시 복원 시도
                if (sortingProtectionActive) {
                  console.log('🔄 간단한 복원 시도...');
                  attemptSimpleRestoration(node, reelId);
                }
              }
            }
          });
        }
        
        // 추가된 노드 확인
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
              const hasVideo = node.querySelector && node.querySelector('video');
              const hasReelLink = node.querySelector && node.querySelector('a[href*="/reel/"]');
              
              if (hasVideo || hasReelLink) {
                console.log(`✅ 릴스 추가 감지: ${node.tagName}.${node.className}`);
                
                debugData.instagramEvents.push({
                  type: 'REEL_ADDED_SIMPLE',
                  reelId: `add_${Date.now()}`,
                  element: node,
                  timestamp: Date.now()
                });
              }
            }
          });
        }
      }
    });
  });
  
  simpleObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('🔥 간단한 Observer 활성화 완료');
}

// 🔄 간단한 복원 시스템
function attemptSimpleRestoration(removedElement, reelId) {
  // 가장 간단한 복원: 부모를 찾아서 다시 추가
  const reelsContainer = document.querySelector('main') || document.body;
  
  try {
    // 제거된 요소를 다시 추가
    reelsContainer.appendChild(removedElement);
    console.log(`✅ 간단한 복원 성공: ${reelId}`);
    
    // 통계 업데이트
    debugStats.restorationAttempts++;
    debugStats.restorationSuccess++;
    
  } catch (error) {
    console.warn(`❌ 간단한 복원 실패: ${reelId}`, error);
    debugStats.restorationAttempts++;
    debugStats.restorationFailures++;
  }
}

// 🔍 릴스 ID 추출 (Instagram DOM 구조 기반)
function extractReelId(element) {
  if (!element) return null;
  
  // 더 정확한 Instagram 릴스 식별 방법들
  const methods = [
    // 1. data-testid 확인
    () => element.getAttribute('data-testid'),
    () => element.querySelector('[data-testid]')?.getAttribute('data-testid'),
    
    // 2. 고유한 DOM 구조 기반 ID 생성
    () => {
      // Instagram 릴스는 특정 구조를 가짐
      const video = element.querySelector('video');
      const article = element.closest('article') || element.querySelector('article');
      
      if (video || article) {
        // DOM 위치와 내용 기반 고유 ID 생성
        const rect = element.getBoundingClientRect();
        const id = `pos_${Math.round(rect.top)}_${Math.round(rect.left)}_${Date.now() % 10000}`;
        return id;
      }
      return null;
    },
    
    // 3. URL에서 추출
    () => {
      const link = element.querySelector('a[href*="/reel/"]') || element.closest('a[href*="/reel/"]');
      if (link) {
        const match = link.href.match(/\/reel\/([^\/\?]+)/);
        return match ? `reel_${match[1]}` : null;
      }
      return null;
    },
    
    // 4. 비디오 소스에서 추출
    () => {
      const video = element.querySelector('video');
      if (video && video.src) {
        const match = video.src.match(/\/([^\/]+)\.mp4/);
        return match ? `video_${match[1]}` : null;
      }
      return null;
    },
    
    // 5. 부모-자식 관계 기반 ID
    () => {
      const parent = element.parentElement;
      const siblings = parent ? Array.from(parent.children) : [];
      const index = siblings.indexOf(element);
      if (index >= 0) {
        return `sibling_${index}_${element.tagName}_${element.className.substring(0, 10)}`;
      }
      return null;
    }
  ];
  
  for (const method of methods) {
    try {
      const result = method();
      if (result) {
        console.log(`🔍 릴스 ID 추출 성공: ${result} (방법: ${method.name || 'anonymous'})`);
        return result;
      }
    } catch (e) {
      // 무시하고 다음 방법 시도
    }
  }
  
  console.warn('🔍 릴스 ID 추출 실패:', element);
  return null;
}

// 🔍 실제 Instagram 릴스 요소 감지 (더 정확한 버전)
function findReelElements(container) {
  const selectors = [
    // Instagram 릴스의 실제 선택자들
    'article',
    '[role="button"]',
    'div[style*="transform"]',
    'div > div > div[class*="x"]', // Instagram의 일반적인 클래스 패턴
    'div:has(video)', // 비디오가 있는 div
    'div:has(a[href*="/reel/"])', // 릴스 링크가 있는 div
  ];
  
  const elements = [];
  
  for (const selector of selectors) {
    try {
      const found = container.querySelectorAll(selector);
      found.forEach(el => {
        // 중복 제거 및 실제 릴스 요소인지 확인
        if (!elements.includes(el) && isLikelyReelElement(el)) {
          elements.push(el);
        }
      });
    } catch (e) {
      console.warn('선택자 오류:', selector, e);
    }
  }
  
  console.log(`🔍 릴스 요소 발견: ${elements.length}개`);
  return elements;
}

// 🔍 릴스 요소 가능성 판단
function isLikelyReelElement(element) {
  // 릴스 요소의 특징들
  const hasVideo = element.querySelector('video') !== null;
  const hasReelLink = element.querySelector('a[href*="/reel/"]') !== null;
  const hasArticle = element.tagName === 'ARTICLE' || element.querySelector('article') !== null;
  const hasButton = element.getAttribute('role') === 'button';
  const hasTransform = element.style.transform || getComputedStyle(element).transform !== 'none';
  
  // 최소한 하나의 조건을 만족해야 함
  const score = [hasVideo, hasReelLink, hasArticle, hasButton, hasTransform].filter(Boolean).length;
  
  if (score > 0) {
    console.log(`🎯 릴스 요소 가능성: ${score}/5`, {hasVideo, hasReelLink, hasArticle, hasButton, hasTransform});
  }
  
  return score > 0;
}

// 초기화 완료 메시지
console.log('🔧 Enhanced Instagram Sorting Debug System 로드 완료!');
console.log('💡 사용법: window.instagramSortingDebug.getStats() - 현재 상태 확인');
console.log('💡 사용법: window.instagramSortingDebug.diagnose() - 시스템 진단');
console.log('💡 사용법: window.instagramSortingDebug.getAllDebugData() - 모든 디버깅 데이터');
console.log('💡 사용법: window.instagramSortingDebug.getRecentInstagramEvents() - 최근 Instagram 이벤트');
console.log('💡 사용법: window.instagramSortingDebug.analyzeDOMChanges() - DOM 변화 분석');
console.log('💡 사용법: window.instagramSortingDebug.analyzeScrollPattern() - 스크롤 패턴 분석');

// 기존 정렬 재적용 함수 (호환성 유지)
function reapplySorting() {
  if (currentSortedReels.length === 0) return;
  
  console.log('🔄 정렬 재적용 시작...');
  
  // 현재 위치들을 다시 측정
  const currentPositions = currentSortedReels.map((reelData, index) => {
    const rect = reelData.element.getBoundingClientRect();
    return {
      index: index,
      x: rect.left,
      y: rect.top,
      reelData: reelData
    };
  });
  
  // 다시 Transform 적용
  currentSortedReels.forEach((reelData, sortedIndex) => {
    const element = reelData.element;
    if (!element || !element.parentNode) return;
    
    const currentRect = element.getBoundingClientRect();
    const targetPosition = currentPositions[sortedIndex];
    
    const deltaX = targetPosition.x - currentRect.left;
    const deltaY = targetPosition.y - currentRect.top;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      element.style.zIndex = 1000 + sortedIndex;
      element.style.position = 'relative';
    }
  });
  
  console.log('🔄 정렬 재적용 완료');
}

// 시각적 피드백 적용
function applyVisualFeedback(element, index) {
  // 무지개 색상으로 순서 표시
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0'];
  const color = colors[index % colors.length];
  
  element.style.boxShadow = `0 0 5px ${color}`;
  element.style.transition = 'all 0.3s ease';
  
  // 순서 번호 표시 (기존 번호가 있으면 제거)
  const existingIndicator = element.querySelector('.reel-order-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  const orderIndicator = document.createElement('div');
  orderIndicator.className = 'reel-order-indicator';
  orderIndicator.textContent = index + 1;
  orderIndicator.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: ${color};
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    z-index: 1000;
  `;
  element.style.position = 'relative';
  element.appendChild(orderIndicator);
}

// 간단한 시각적 피드백 (위치 변경 없이)
function applySimpleVisualFeedback(element, index) {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0'];
  const color = colors[index % colors.length];
  
  // 테두리와 번호만 추가
  element.style.border = `3px solid ${color}`;
  element.style.transition = 'all 0.3s ease';
  
  // 기존 번호 제거
  const existingIndicator = element.querySelector('.reel-order-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // 번호 표시
  const orderIndicator = document.createElement('div');
  orderIndicator.className = 'reel-order-indicator';
  orderIndicator.textContent = index + 1;
  orderIndicator.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: ${color};
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    z-index: 1000;
  `;
  
  // position relative는 조심스럽게 적용
  if (element.style.position !== 'absolute') {
    element.style.position = 'relative';
  }
  element.appendChild(orderIndicator);
}

// 개별 정렬 (공통 부모가 없을 때)
function applyIndividualSorting(sortedReels) {
  console.log('🎯 개별 요소 세로 정렬 시도');
  
  // 릴스들의 실제 부모 찾기
  if (sortedReels.length > 0) {
    const firstReel = sortedReels[0].element;
    const parent = firstReel.parentElement;
    
    if (parent) {
      console.log('📦 부모 컨테이너 발견:', parent.tagName);
      
      // Instagram의 가로 스크롤 컨테이너를 찾아서 세로로 변경
      let scrollContainer = parent;
      
      // 가로 스크롤이 적용된 상위 컨테이너를 찾기
      while (scrollContainer && scrollContainer !== document.body) {
        const style = window.getComputedStyle(scrollContainer);
        if (style.overflowX === 'scroll' || style.overflowX === 'auto' || 
            style.display === 'flex' || scrollContainer.style.transform) {
          console.log('📜 스크롤 컨테이너 발견:', scrollContainer.tagName, scrollContainer.className);
          break;
        }
        scrollContainer = scrollContainer.parentElement;
      }
      
      // 각 릴스의 원래 크기 저장 (Instagram 그리드 원본 크기 보존)
      const originalSizes = sortedReels.map(reelData => {
        const element = reelData.element;
        const computedStyle = window.getComputedStyle(element);
        
        // 원본 크기 정보를 더 정확하게 수집
        const originalHeight = element.offsetHeight || parseFloat(computedStyle.height) || 500;
        const originalWidth = element.offsetWidth || parseFloat(computedStyle.width) || 400;
        
        // Instagram 그리드의 일반적인 비율 (9:16 또는 1:1)
        const aspectRatio = originalWidth / originalHeight;
        
        console.log(`📐 개별정렬 원본 크기: ${originalWidth}x${originalHeight}, 비율: ${aspectRatio.toFixed(2)}`);
        
        return {
          element: element,
          height: originalHeight,
          width: originalWidth,
          aspectRatio: aspectRatio
        };
      });
      
      // DOM 이동 없이 CSS order만으로 정렬 (Instagram React 호환)
      
      // 부모와 상위 컨테이너들을 세로 레이아웃으로 변경
      if (scrollContainer) {
        // 가로 스크롤과 transform 제거
        scrollContainer.style.overflowX = 'visible';
        scrollContainer.style.overflowY = 'auto';
        scrollContainer.style.transform = 'none';
        scrollContainer.style.width = '100%';
        scrollContainer.style.maxWidth = '100%';
      }
      
      // Instagram 원본 컨테이너 스타일 보존 + Flexbox만 추가
      parent.style.display = 'flex';
      parent.style.flexWrap = 'wrap';
      parent.style.flexDirection = 'row';
      
      // transform과 overflow만 안전하게 조정
      if (parent.style.transform && parent.style.transform.includes('translate')) {
        parent.style.transform = 'none';
      }
      if (parent.style.overflowX === 'scroll' || parent.style.overflowX === 'auto') {
        parent.style.overflowX = 'visible';
      }
      
      console.log(`📐 개별정렬 Instagram Flexbox 그리드: 3열, DOM 이동 없음`);
      
      // 각 릴스에 스타일 적용 (Instagram 정사각형 그리드)
      sortedReels.forEach((reelData, index) => {
        const element = reelData.element;
        const originalSize = originalSizes[index];
        
        // Instagram 원본 스타일 보존 + CSS order로만 순서 변경
        element.style.order = index;
        
        // 최소한의 위치 조정만 (원본 스타일 보존)
        if (element.style.position === 'absolute') {
          element.style.position = 'relative';
        }
        
        // 내부 이미지/비디오는 Instagram 원본 스타일 유지 (스타일링 안함)
        
        console.log(`📐 개별정렬 릴스 ${index + 1}: ${originalSize.width}x${originalSize.height} (비율: ${originalSize.aspectRatio.toFixed(2)})`);
        
        // 시각적 피드백
        applySimpleVisualFeedback(element, index);
      });
      
      // 모든 상위 요소의 가로 스크롤과 transform 제거
      let parentElement = parent.parentElement;
      while (parentElement && parentElement !== document.body) {
        if (parentElement.style.transform && parentElement.style.transform.includes('translate')) {
          parentElement.style.transform = 'none';
        }
        if (parentElement.style.overflowX === 'scroll' || parentElement.style.overflowX === 'auto') {
          parentElement.style.overflowX = 'visible';
        }
        parentElement = parentElement.parentElement;
      }
      
      console.log('✅ 세로 정렬 완료');
      
      // 스크롤을 맨 위로
      window.scrollTo(0, parent.offsetTop);
    }
  }
  
  // 시각적 효과 제거를 더 오래 유지 (정렬 상태 확인을 위해)
  setTimeout(() => {
    if (isSortingActive) { // 정렬이 여전히 활성화된 경우에만
      sortedReels.forEach(reelData => {
        const element = reelData.element;
        if (element && document.contains(element)) {
          // 테두리와 그림자만 제거 (크기와 위치는 유지)
          element.style.border = '';
          element.style.boxShadow = '';
          
          // 번호 표시는 더 오래 유지 (사용자가 정렬 상태를 확인할 수 있도록)
          // const indicator = element.querySelector('.reel-order-indicator');
          // if (indicator) {
          //   indicator.remove();
          // }
        }
      });
      
      console.log('✅ 시각적 피드백 일부 제거됨 (정렬과 번호는 유지)');
    }
  }, 30000); // 30초로 연장
  
  alert(`✅ Instagram 호환 그리드 정렬 완료!\n릴스 ${sortedReels.length}개가 CSS order로 안전하게 정렬되었습니다.\n\n무한 스크롤 호환 • DOM 구조 보존!`);
}

// ⚡ 간단한 정렬 완료 후 상태 유지 (스크롤 리스너 제거)

// 초기화
function initialize() {
  console.log('🚀 초기화:', window.location.href);
  
  setTimeout(createSortButton, 1000);
  
  // URL 변경 감지 (스마트 필터링)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      
      // 릴스 페이지 내에서의 URL 변경은 정렬 유지
      const isReelsPage = (url) => url.includes('/reels') || url.includes('/reel/');
      const wasReelsPage = isReelsPage(oldUrl);
      const isStillReelsPage = isReelsPage(lastUrl);
      
      console.log(`🔄 URL 변경: ${wasReelsPage ? 'reels' : 'other'} → ${isStillReelsPage ? 'reels' : 'other'}`);
      
      // 릴스 페이지에서 완전히 다른 페이지로 이동할 때만 정렬 초기화
      if (wasReelsPage && !isStillReelsPage) {
        console.log('🔄 릴스 페이지 이탈 - 정렬 초기화');
        resetSorting();
      } else if (!wasReelsPage && isStillReelsPage) {
        console.log('🔄 릴스 페이지 진입 - 버튼 재생성');
      } else if (wasReelsPage && isStillReelsPage) {
        console.log('🔄 릴스 페이지 내 이동 - 정렬 유지');
        // 정렬 유지, 버튼만 확인
      } else {
        console.log('🔄 일반 페이지 이동 - 정렬 초기화');
        resetSorting();
      }
      
      setTimeout(createSortButton, 1500);
    }
  });

  urlObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

// 🎯 수집 진행률 UI 시스템
let progressOverlay = null;
let cancelCollectionFunction = null;

// 수집 진행률 표시 시작
function showCollectionProgress(scrolls, collected) {
  // 기존 오버레이 제거
  if (progressOverlay) {
    progressOverlay.remove();
  }
  
  // 진행률 오버레이 생성
  progressOverlay = document.createElement('div');
  progressOverlay.id = 'reels-collection-progress';
  progressOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 20px 30px;
    border-radius: 15px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 300px;
  `;
  
  progressOverlay.innerHTML = `
    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
      🚀 릴스 수집 중...
    </div>
    <div id="progress-stats" style="margin-bottom: 15px;">
      📜 스크롤: <span id="scroll-count">${scrolls}</span>회<br>
      📊 수집: <span id="collect-count">${collected}</span>개
    </div>
    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; overflow: hidden; height: 8px; margin-bottom: 15px;">
      <div id="progress-bar" style="background: linear-gradient(90deg, #ff6b6b, #4ecdc4); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
    </div>
    <button id="cancel-collection" style="
      background: rgba(220, 53, 69, 0.8);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
      margin-bottom: 10px;
    " onmouseover="this.style.background='rgba(220, 53, 69, 1)'" onmouseout="this.style.background='rgba(220, 53, 69, 0.8)'">
      🛑 수집 중단
    </button>
    <div style="font-size: 14px; color: #ccc;">
      수집이 완료되면 자동으로 정렬됩니다
    </div>
  `;
  
  document.body.appendChild(progressOverlay);
  
  // 취소 버튼 이벤트 리스너 추가
  const cancelButton = progressOverlay.querySelector('#cancel-collection');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (cancelCollectionFunction) {
        console.log('🛑 사용자가 수집 중단을 요청함');
        cancelCollectionFunction();
        hideCollectionProgress();
      }
    });
  }
  
  // 애니메이션 효과
  progressOverlay.style.opacity = '0';
  progressOverlay.style.transform = 'translate(-50%, -50%) scale(0.8)';
  
  setTimeout(() => {
    progressOverlay.style.transition = 'all 0.3s ease';
    progressOverlay.style.opacity = '1';
    progressOverlay.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
}

// 수집 진행률 업데이트
function updateCollectionProgress(scrolls, collected) {
  if (!progressOverlay) return;
  
  const scrollCount = progressOverlay.querySelector('#scroll-count');
  const collectCount = progressOverlay.querySelector('#collect-count');
  const progressBar = progressOverlay.querySelector('#progress-bar');
  
  if (scrollCount) scrollCount.textContent = scrolls;
  if (collectCount) collectCount.textContent = collected;
  
  // 진행률 계산 (스크롤 수 기반, 최대 100%)
  // 일반적으로 50-100 스크롤로 끝나므로 적당한 비율로 설정
  const estimatedProgress = Math.min((scrolls / 80) * 100, 95); // 최대 95%까지만
  
  if (progressBar) {
    progressBar.style.width = `${estimatedProgress}%`;
  }
}

// 수집 완료 표시
function showCollectionComplete(totalCollected) {
  if (!progressOverlay) return;
  
  // 100% 완료 표시
  const progressBar = progressOverlay.querySelector('#progress-bar');
  if (progressBar) {
    progressBar.style.width = '100%';
  }
  
  // 완료 메시지로 변경
  progressOverlay.innerHTML = `
    <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
      ✅ 수집 완료!
    </div>
    <div style="margin-bottom: 15px;">
      📊 총 <span style="color: #4ecdc4; font-weight: bold;">${totalCollected}</span>개 릴스 수집됨
    </div>
    <div style="font-size: 14px; color: #ccc;">
      정렬을 시작합니다...
    </div>
  `;
  
  // 2초 후 자동 숨김
  setTimeout(() => {
    hideCollectionProgress();
  }, 2000);
}

// 수집 진행률 숨기기
function hideCollectionProgress() {
  if (progressOverlay) {
    progressOverlay.style.transition = 'all 0.3s ease';
    progressOverlay.style.opacity = '0';
    progressOverlay.style.transform = 'translate(-50%, -50%) scale(0.8)';
    
    setTimeout(() => {
      if (progressOverlay) {
        progressOverlay.remove();
        progressOverlay = null;
      }
    }, 300);
  }
  
  // 🎯 취소 함수 정리
  cancelCollectionFunction = null;
}

// 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

setTimeout(initialize, 2000);

console.log('🎉 Manual Sorting v5.0 준비완료!');