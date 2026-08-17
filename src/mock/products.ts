import { ProductRecommendation } from '../types';

// Backend products.json을 기준으로 한 로컬 폴백이다. API 연결 전에도 같은 상품/가격/사진을 보여 준다.
const PRODUCT_IMAGES = [
  require('../../assets/products/product-01.jpg'), require('../../assets/products/product-02.jpg'),
  require('../../assets/products/product-03.jpg'), require('../../assets/products/product-04.jpg'),
  require('../../assets/products/product-05.jpg'), require('../../assets/products/product-06.jpg'),
  require('../../assets/products/product-07.jpg'), require('../../assets/products/product-08.jpg'),
  require('../../assets/products/product-09.jpg'), require('../../assets/products/product-10.jpg'),
  require('../../assets/products/product-11.jpg'), require('../../assets/products/product-12.jpg'),
  require('../../assets/products/product-13.jpg'), require('../../assets/products/product-14.jpg'),
  require('../../assets/products/product-15.jpg'), require('../../assets/products/product-16.jpg'),
  require('../../assets/products/product-17.jpg'), require('../../assets/products/product-18.jpg'),
  require('../../assets/products/product-19.jpg'),
];

const SOURCE_PRODUCTS = [
  ['bag001', 'Pina 비세토스 숄더백', '가방', 1690000, true], ['bag002', 'Stark 사이드 스터드 백팩', '가방', 2290000, true],
  ['bag003', 'Rockstar 로렐 숄더백', '가방', 1550000, true], ['bag004', 'Fursten 비세토스 벨트백', '가방', 1450000, true],
  ['bag005', 'New Liz 리버서블 쇼퍼', '가방', 1090000, true], ['bag006', 'Aren 모노그램 에코닐 보스턴백', '가방', 1090000, true],
  ['bag007', 'Aren 레더 토트백', '가방', 990000, true], ['bag008', 'Aren 모노그램 에코닐 백팩', '가방', 1850000, true],
  ['bag009', 'Aren 모노그램 에코닐 토트', '가방', 1350000, true], ['bag010', 'Aren 레더 백팩', '가방', 1450000, true],
  ['acc001', '레더 로고 스카프 링', '액세서리', 330000, true], ['acc002', '하이브리드 실크 트윌리', '액세서리', 195000, true],
  ['acc003', '모노그램 레더 롱 월렛', '액세서리', 390000, true], ['per001', '코스믹 펄 오 드 퍼퓸', '향수', 94000, true],
  ['per002', '코코 베일 오 드 퍼퓸', '향수', 229000, true], ['per003', '블랙 머스크 오 드 퍼퓸', '향수', 210000, true],
  ['tec001', '모노그램 에어팟 프로 케이스', '테크', 310000, true], ['tec002', '비세토스 Apple Watch 밴드', '테크', 290000, true],
  ['tec003', 'MCM X CASETiFY 모노그램 iPhone 17 Pro 케이스', '테크', 239000, false],
] as const;

const TONES: ProductRecommendation['tone'][] = ['cognac', 'black', 'champagne'];

export const MOCK_PRODUCTS: ProductRecommendation[] = SOURCE_PRODUCTS.map(
  ([productId, productName, category, price, recommendable], index) => ({
    productId, productName, category, price, recommendable,
    variant: category === '가방' ? 'MCM Signature' : category,
    tone: TONES[index % TONES.length],
    reason: '고객님의 여정과 선호를 바탕으로 추천하는 MCM 제품입니다.',
    imageUrl: PRODUCT_IMAGES[index],
  }),
);

export const RECOMMENDABLE_PRODUCTS = MOCK_PRODUCTS.filter((product) => product.recommendable);
