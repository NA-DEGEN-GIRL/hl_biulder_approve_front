// [신규 파일] 빌더 목록 예시. 이 형식에 맞춰 항목을 추가/수정하세요.
export type BuilderEntry = {
  name: string;   // 인식하기 쉬운 표시 이름
  address: string; // 0x로 시작하는 EVM 주소(대소문자 무관). 유효하지 않으면 필터링됨
};

// [예시 데이터] 반드시 실제 유효한 주소로 교체하세요.
// 주석: 아래 주소들은 형식 예시일 뿐입니다.
export const BUILDER_LIST: BuilderEntry[] = [
  { name: "Lit.Trader",   address: "0x24a747628494231347f4f6aead2ec14f50bcc8b7" },
  { name: "BasedOne",   address: "0x1924b8561eef20e70ede628a296175d358be80e5" },
  { name: "Dexari",   address: "0x7975cafdff839ed5047244ed3a0dd82a89866081" },
  { name: "Liquid",   address: "0x6d4e7f472e6a491b98cbeed327417e310ae8ce48" },
  { name: "Sueprcexy",   address: "0x0000000bfbf4c62c43c2e71ef0093f382bf7a7b4" },
  { name: "Superstack",   address: "0xcdb943570bcb48a6f1d3228d0175598fea19e87b" },
  { name: "Bullpen",   address: "0x4c8731897503f86a2643959cbaa1e075e84babb7" },
  { name: "Mass",   address: "0xf944069b489f1ebff4c3c6a6014d58cbef7c7009" },
  { name: "Tread.fi",   address: "0x999a4b5f268a8fbf33736feff360d462ad248dbf" },
  { name: "Dreamcash",   address: "0x4950994884602d1b6c6d96e4fe30f58205c39395" },
];

// 사용 가이드:
// - name: 화면에 표시될 이름
// - address: 0x + 40자리 hex. 대소문자 상관없음(코드에서 체크섬 처리).
// - 유효하지 않은 항목은 자동으로 제외됩니다.