export type DomesticStore = { id: string; name: string; location: string };

// 전달받은 stores.json 기준. CA 선택 UI와 실제 API storeId 매핑에서 공통으로 사용한다.
export const DOMESTIC_STORES: DomesticStore[] = [
  ['MCM 롯데백화점 본점', '서울 중구 소공로 1'], ['MCM HAUS', '서울 강남구 청담동 78-12'],
  ['MCM 신세계면세점 본점', '서울 중구 충무로 54'], ['MCM 인천공항면세점', '인천 중구 공항로 2840'],
  ['MCM 롯데면세점 부산점', '부산 부산진구 부전동 503-15'], ['MCM 신세계프리미엄아울렛 파주점', '경기 파주시 탄현면 법흥리 1790-8'],
  ['MCM 롯데백화점 대구점', '대구 북구 태평로 302-155'], ['MCM 롯데월드몰점', '서울 송파구 올림픽로 300'],
  ['MCM 현대백화점 판교점', '경기 성남시 분당구 판교역로146번길 20'], ['MCM 스타필드 하남점', '경기 하남시 미사대로 750'],
  ['MCM 신세계백화점 강남점', '서울 서초구 신반포로 176'], ['MCM IFC몰 여의도점', '서울 영등포구 국제금융로 10'],
  ['MCM 갤러리아 광교점', '경기 수원시 영통구 광교중앙로 124'], ['MCM 현대백화점 무역센터점', '서울 강남구 테헤란로 517'],
  ['MCM 신세계 센텀시티점', '부산 해운대구 센텀남대로 35'], ['MCM 갤러리아 타임월드점', '대전 서구 대덕대로 211'],
  ['MCM 롯데백화점 울산점', '울산 남구 삼산로 288'], ['MCM AK플라자 수원점', '경기 수원시 팔달구 덕영대로 924'],
  ['MCM 신세계 Art & Science 대전점', '대전 유성구 엑스포로 1'],
].map(([name, location], index) => ({ id: `store-${String(index + 1).padStart(2, '0')}`, name, location }));

export const findDomesticStore = (name: string) => DOMESTIC_STORES.find((store) => store.name === name);
