import { DistrictPreset, Scenario } from '../types.ts';

export const DISTRICT_PRESETS: DistrictPreset[] = [
  {
    id: 'central_commercial',
    name: 'Merkez Ticaret ve Yoğun Konut Bölgesi',
    category: 'Şehir Merkezi (Örn: Kadıköy / Çankaya / Alsancak)',
    description: 'Yüksek katlı yapılaşma, yoğun araç sirkülasyonu ve dar sokak aralarında sıkışmış düşük yeşil alan oranı. Kentsel ısı adası etkisi belirgindir.',
    tag: 'Yüksek Isı & Trafik',
    indicators: {
      temperature: 33.6,
      trafficDensity: 84,
      trafficLevel: 'Yüksek',
      no2Level: 58,
      builtUpDensity: 82,
      greenSpaceRatio: 8,
    },
  },
  {
    id: 'industrial_transit',
    name: 'Sanayi & Lojistik Çevresi',
    category: 'Endüstriyel & Otoyol Koridoru (Örn: OSB / Çevre Yolu Aksı)',
    description: 'Ağır vasıta taşımacılığı kaynaklı yüksek NO₂ emisyonu, geniş asfalt ve beton yüzeyler; ancak kısmi boş alan rezervi mevcuttur.',
    tag: 'Kritik NO₂ Baskısı',
    indicators: {
      temperature: 31.4,
      trafficDensity: 76,
      trafficLevel: 'Yüksek',
      no2Level: 68,
      builtUpDensity: 70,
      greenSpaceRatio: 12,
    },
  },
  {
    id: 'developing_periphery',
    name: 'Gelişmekte Olan Çeper Yerleşim',
    category: 'Yeni İmar Bölgesi (Örn: Uydu Kentler / Çeper Konutlar)',
    description: 'Hızla betonlaşma sürecinde olan, yeni site yapılaşmalarının sürdüğü, henüz planlama aşamasında yeşil koridor entegrasyonuna uygun bölge.',
    tag: 'Fırsat & Koruma',
    indicators: {
      temperature: 29.8,
      trafficDensity: 46,
      trafficLevel: 'Orta',
      no2Level: 34,
      builtUpDensity: 54,
      greenSpaceRatio: 19,
    },
  },
  {
    id: 'historic_core',
    name: 'Tarihi ve Dar Sokaklı Eski Şehir',
    category: 'Kentsel Sit / Tarihi Doku (Örn: Suriçi / Kaleiçi)',
    description: 'Kanyon etkisiyle sıcak havanın hapsolduğu, arsa üretiminin son derece kısıtlı olduğu, mikro cep parkı çözümlerine muhtaç alan.',
    tag: 'Aşırı Yapılaşma',
    indicators: {
      temperature: 34.2,
      trafficDensity: 62,
      trafficLevel: 'Orta',
      no2Level: 48,
      builtUpDensity: 88,
      greenSpaceRatio: 5,
    },
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'protect_and_enhance',
    title: '1. Mevcut Yeşil Alanların Korunması ve İyileştirilmesi',
    subtitle: 'Niteliksel Güçlendirme & Biyoçeşitlilik Odaklı İyileştirme',
    description: 'Mevcut park, refüj ve kamusal bahçelerin toprak yapısının ıslahı, kurakçıl yerel ağaç dikimi, gölgeleme artışı ve geçirgen zemin kaplamaları.',
    scope: 'Mevcut yeşil örtü kalitesinde +%4-%6 efektif ekolojik kapasite artışı; zemin geçirgenliği.',
    costLevel: 1,
    costLabel: 'Düşük / Ekonomik Bütçe (₺)',
    implementationTime: '3 - 6 Ay',
    tempReductionDemo: 0.7,
    no2ReductionDemo: 9,
    greenIncreaseDemo: 4,
    accessibilityDemo: 'Mevcut alanların kalitesi ve mikro gölgeleme artar',
    advantages: [
      'Hızlı uygulama ve asgari bürokratik onay süreci',
      'Kamulaştırma ve mülkiyet sorunu gerektirmez',
      'Düşük başlangıç ve işletme maliyeti',
      'Yerel kurakçıl bitkilerle su tasarrufu',
    ],
    limitations: [
      'Şehre yeni metrekare bazında alan kazandırmaz',
      'Aşırı yoğun yapılaşmış sokak aralarındaki ısı adasını kırmakta sınırlı kalır',
      'Hava sirkülasyon koridoru oluşturamaz',
    ],
    recommendedWhen: 'Bütçe kısıtlı olduğunda veya yeni kamulaştırma alanı bulunmayan tarihi/yoğun merkezlerde hızlı kazanım için uygundur.',
  },
  {
    id: 'new_pocket_parks',
    title: '2. Yeni Ağaçlandırma ve Kentsel Cep Parkları',
    subtitle: 'Noktasal Doğa Temelli Müdahale & Mahalle Ölçeğinde Dağılım',
    description: 'Atıl kamu arazileri, okul bahçeleri, otopark kenarları ve geniş kaldırımlarda mikro yeşil vahalar (pocket parks) ve cadde ağaçlandırması.',
    scope: 'Bölgeye +%8 - %14 yeni yeşil yüzey kazancı; 300 metre yürüme erişiminde yeşil nokta artışı.',
    costLevel: 2,
    costLabel: 'Orta / Dengeli Bütçe (₺₺)',
    implementationTime: '6 - 18 Ay',
    tempReductionDemo: 1.8,
    no2ReductionDemo: 18,
    greenIncreaseDemo: 11,
    accessibilityDemo: 'Mahalle sakinlerinin 5 dakikalık yürüme mesafesinde yeşil erişimi',
    advantages: [
      'Mahalle düzeyinde mikro ısı adasını doğrudan kırar',
      'Vatandaşlar için görsel ve psikolojik refah sağlar',
      'Araç trafiği ile yaya alanları arasında tampon oluşturur',
      'Havadaki partikül ve NO₂ tutulumunu lokal olarak belirgin düşürür',
    ],
    limitations: [
      'Yeraltı altyapı şebekeleri (su, elektrik, doğalgaz hatları) ile çakışma riski',
      'Düzenli sulama ve bakım yönetimi gerektirir',
      'Özel mülkiyetli parsellerde kamulaştırma ihtiyacı doğabilir',
    ],
    recommendedWhen: 'Yapılaşma yoğunluğunun %70-85 arasında olduğu ve mahalle sakinlerinin yeşile erişim mesafesinin çok uzak kaldığı bölgelerde en dengeli çözümdür.',
  },
  {
    id: 'green_corridors',
    title: '3. Yeşil Koridorlar ve Doğa Temelli Müdahalelerin Entegrasyonu',
    subtitle: 'Bölgesel Ekolojik Ağ & Rüzgar Akışı Simülasyonu',
    description: 'Hâkim rüzgar yönüne paralel kesintisiz doğrusal yeşil hatlar, biyo-hendekler (bioswales), yağmur bahçeleri ve geniş cadde ormanları.',
    scope: 'Bölgeye +%18 - %25 ekolojik bağlantı; su tutma ve soğutma koridoru.',
    costLevel: 3,
    costLabel: 'Yüksek / Kapsamlı Yatırım (₺₺₺)',
    implementationTime: '18 - 36 Ay',
    tempReductionDemo: 2.9,
    no2ReductionDemo: 31,
    greenIncreaseDemo: 22,
    accessibilityDemo: 'Kesintisiz yaya ve bisiklet yeşil ulaşım aksları',
    advantages: [
      'Kentsel hava sirkülasyonunu açarak şehri doğal olarak soğutur',
      'Ağır trafik kaynaklı NO₂ ve kirleticileri koridor boyunca süzüp dağıtır',
      'Aşırı yağışlarda ani taşkın ve sel riskini doğa temelli filtreler',
      'Biyoçeşitlilik ve yaban hayatı için göç köprüsü oluşturur',
    ],
    limitations: [
      'Yüksek başlangıç sermaye yatırımı ve geniş alan ihtiyacı',
      'Çok paydaşlı imar planı revizyonu ve kurumlar arası koordinasyon zorluğu',
      'Uygulama sürecinin birkaç yıla yayılması',
    ],
    recommendedWhen: 'Trafik yoğunluğu veya NO₂ seviyeleri kritik düzeyde olan, geniş ulaşım akslarına sahip veya gelişmekte olan çeper bölgelerde uzun vadeli dönüşüm için en etkilidir.',
  },
];

// 4x4 şematik mikro-bölge matrisi için örnek hücreler
export interface GridCell {
  x: number;
  y: number;
  name: string;
  temp: number;
  traffic: number;
  no2: number;
  builtUp: number;
  green: number;
  type: 'Ticari' | 'Konut' | 'Sanayi' | 'Park / Koruluk' | 'Ulaşım Aksı';
}

export const SCHEMATIC_GRID: GridCell[] = [
  { x: 0, y: 0, name: 'Kuzey Sanayi Girişi', temp: 31.8, traffic: 80, no2: 64, builtUp: 74, green: 10, type: 'Sanayi' },
  { x: 1, y: 0, name: 'Otoyol Kavşağı', temp: 33.1, traffic: 88, no2: 72, builtUp: 80, green: 7, type: 'Ulaşım Aksı' },
  { x: 2, y: 0, name: 'Yeni Lojistik Bölge', temp: 30.5, traffic: 70, no2: 56, builtUp: 65, green: 15, type: 'Sanayi' },
  { x: 3, y: 0, name: 'Kuzey Çeper Koruma', temp: 28.2, traffic: 35, no2: 28, builtUp: 40, green: 35, type: 'Park / Koruluk' },

  { x: 0, y: 1, name: 'Tarihi Çarşı Merkezi', temp: 34.5, traffic: 65, no2: 50, builtUp: 90, green: 4, type: 'Ticari' },
  { x: 1, y: 1, name: 'Merkez İş Alanı (CBD)', temp: 34.0, traffic: 85, no2: 60, builtUp: 85, green: 6, type: 'Ticari' },
  { x: 2, y: 1, name: 'Yoğun Konut Mahallesi', temp: 32.5, traffic: 60, no2: 44, builtUp: 75, green: 12, type: 'Konut' },
  { x: 3, y: 1, name: 'Kentsel Park Alanı', temp: 27.5, traffic: 25, no2: 24, builtUp: 20, green: 55, type: 'Park / Koruluk' },

  { x: 0, y: 2, name: 'Eski Konut Dokusu', temp: 33.0, traffic: 55, no2: 42, builtUp: 82, green: 8, type: 'Konut' },
  { x: 1, y: 2, name: 'Ana Cadde & Tramvay', temp: 32.8, traffic: 75, no2: 54, builtUp: 78, green: 9, type: 'Ulaşım Aksı' },
  { x: 2, y: 2, name: 'Eğitim & Kampüs Çevresi', temp: 30.2, traffic: 45, no2: 36, builtUp: 58, green: 22, type: 'Konut' },
  { x: 3, y: 2, name: 'Çeper Gelişme Alanı', temp: 29.4, traffic: 40, no2: 30, builtUp: 50, green: 24, type: 'Konut' },

  { x: 0, y: 3, name: 'Güney Kıyı Bandı', temp: 28.8, traffic: 50, no2: 32, builtUp: 45, green: 30, type: 'Park / Koruluk' },
  { x: 1, y: 3, name: 'Sahil Bulvarı', temp: 30.0, traffic: 72, no2: 48, builtUp: 60, green: 18, type: 'Ulaşım Aksı' },
  { x: 2, y: 3, name: 'Karma Kullanım Sitesi', temp: 29.6, traffic: 48, no2: 35, builtUp: 55, green: 20, type: 'Konut' },
  { x: 3, y: 3, name: 'Yeşil Vadi Rezervi', temp: 26.8, traffic: 20, no2: 20, builtUp: 15, green: 65, type: 'Park / Koruluk' },
];
