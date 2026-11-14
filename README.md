# Portfolio WebApp 🚀

> 게임 기획, 세계관, 시나리오 및 인터랙티브 작업물을 담은 모던 웹앱 스타일 포트폴리오입니다.

---

## ✨ 주요 기능 (Features)
- **Dynamic JSON Data Loading:** `projects.json` 파일 분리를 통한 간편한 프로젝트 관리 및 유지보수
- **Real-time Search:** 프로젝트 제목, 요약, 본문 키워드 통합 실시간 검색 기능
- **Category Filtering:** 분야별(Game Design, Scenario, VFX & Art 등) 즉시 필터링
- **Theme Toggle:** 다크 모드 / 라이트 모드 전환 및 사용자 설정 로컬 스토리지(`localStorage`) 저장
- **Interactive Modal:** 상세 내용 및 외부 링크를 직관적으로 확인할 수 있는 팝업 뷰어

---

## 🛠️ 기술 스택 (Tech Stack)
- **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Hosting:** Cloudflare Pages / Vercel

---

## 📂 프로젝트 구조 (Project Structure)
```text
portfolio-webapp/
├── index.html          # 메인 앱 레이아웃 및 UI 뼈대
├── style.css           # 다크/라이트 테마 및 앱 스타일시트
├── app.js              # 데이터 로딩, 검색, 필터링, 모달 제어 로직
├── data/
│   └── projects.json   # 프로젝트 상세 데이터 소스
└── README.md           # 프로젝트 문서 및 업데이트 로그