import { UrbanIndicators, Scenario, AIAnalysisResult, ScenarioId } from '../types.ts';
import { SCENARIOS } from '../data/presets.ts';

export interface UrbanStressMetrics {
  stressScore: number; // 0 - 100
  heatRiskLabel: 'Düşük' | 'Orta' | 'Yüksek Isı Adası' | 'Aşırı Isı Riski';
  airQualityLabel: 'İyi' | 'Hassas' | 'Sağlıksız' | 'Kritik';
  deficitLabel: 'Yeterli' | 'Kritik Eşik Altında' | 'Acil Yeşil Alan İhtiyacı';
  primaryIssueCode: 'heat' | 'pollution' | 'density';
}

export function calculateUrbanStress(indicators: UrbanIndicators): UrbanStressMetrics {
  // Sıcaklık faktörü (22C normal, 38C kritik): ağırlık %30
  const tempFactor = Math.min(Math.max((indicators.temperature - 22) / (38 - 22), 0), 1) * 30;
  
  // NO2 ve trafik faktörü (20 normal, 75 kritik): ağırlık %25
  const pollutionFactor = Math.min(Math.max((indicators.no2Level - 20) / (75 - 20), 0), 1) * 25;
  
  // Yapılaşma yoğunluğu faktörü (%30 normal, %90 kritik): ağırlık %25
  const builtUpFactor = Math.min(Math.max((indicators.builtUpDensity - 30) / (90 - 30), 0), 1) * 25;
  
  // Yeşil alan eksikliği (%35 ideal, %5 acil kriz): ağırlık %20
  const greenDeficitFactor = Math.min(Math.max((35 - indicators.greenSpaceRatio) / (35 - 5), 0), 1) * 20;

  const stressScore = Math.round(tempFactor + pollutionFactor + builtUpFactor + greenDeficitFactor);

  let heatRiskLabel: UrbanStressMetrics['heatRiskLabel'] = 'Düşük';
  if (indicators.temperature >= 34) heatRiskLabel = 'Aşırı Isı Riski';
  else if (indicators.temperature >= 31) heatRiskLabel = 'Yüksek Isı Adası';
  else if (indicators.temperature >= 27) heatRiskLabel = 'Orta';

  let airQualityLabel: UrbanStressMetrics['airQualityLabel'] = 'İyi';
  if (indicators.no2Level >= 60) airQualityLabel = 'Kritik';
  else if (indicators.no2Level >= 45) airQualityLabel = 'Sağlıksız';
  else if (indicators.no2Level >= 30) airQualityLabel = 'Hassas';

  let deficitLabel: UrbanStressMetrics['deficitLabel'] = 'Yeterli';
  if (indicators.greenSpaceRatio <= 7) deficitLabel = 'Acil Yeşil Alan İhtiyacı';
  else if (indicators.greenSpaceRatio <= 15) deficitLabel = 'Kritik Eşik Altında';

  // En baskın sorunu saptama
  let primaryIssueCode: UrbanStressMetrics['primaryIssueCode'] = 'heat';
  if (pollutionFactor > tempFactor && pollutionFactor > greenDeficitFactor) {
    primaryIssueCode = 'pollution';
  } else if (greenDeficitFactor > tempFactor && indicators.builtUpDensity > 75) {
    primaryIssueCode = 'density';
  }

  return {
    stressScore,
    heatRiskLabel,
    airQualityLabel,
    deficitLabel,
    primaryIssueCode,
  };
}

export function calculateProjectedImpact(indicators: UrbanIndicators, scenario: Scenario) {
  // Prototip dinamik hesaplama modeli
  // Baz değerlere göre orantılı varsayımsal etki hesabı (Bilimsel doğrulanmış kesin tahmin değildir)
  const tempDelta = Number((scenario.tempReductionDemo * (indicators.temperature > 32 ? 1.15 : 0.9)).toFixed(1));
  const no2DeltaPct = Math.round(scenario.no2ReductionDemo * (indicators.trafficDensity > 70 ? 1.1 : 0.95));
  const greenDelta = scenario.greenIncreaseDemo;

  const projectedTemp = Number(Math.max(indicators.temperature - tempDelta, 20).toFixed(1));
  const projectedNo2 = Number(Math.max(indicators.no2Level * (1 - no2DeltaPct / 100), 12).toFixed(1));
  const projectedGreen = Math.min(indicators.greenSpaceRatio + greenDelta, 75);

  return {
    tempDelta,
    no2DeltaPct,
    greenDelta,
    projectedTemp,
    projectedNo2,
    projectedGreen,
  };
}

/**
 * Deterministik Kural Tabanlı Yedek Analiz Motoru
 * Gerçek Gemini API çalışmadığında veya anahtar olmadığında şeffaf biçimde çalıştırılır.
 */
export function generateRuleBasedAIAnalysis(
  indicators: UrbanIndicators,
  selectedScenarioId: ScenarioId = 'new_pocket_parks'
): AIAnalysisResult {
  const stress = calculateUrbanStress(indicators);

  // Karar ağacı:
  let recommendedId: ScenarioId = 'new_pocket_parks';
  let priorityIssue = '';

  if (indicators.no2Level >= 55 || indicators.trafficDensity >= 75) {
    recommendedId = 'green_corridors';
    priorityIssue = `Yüksek Trafik ve NO₂ Kirliliği Baskısı (${indicators.no2Level} µg/m³ NO₂, %${indicators.trafficDensity} Trafik Yoğunluğu)`;
  } else if (indicators.builtUpDensity >= 80 && indicators.greenSpaceRatio <= 8) {
    recommendedId = 'new_pocket_parks';
    priorityIssue = `Aşırı Yapılaşma ve Mahalle Ölçeğinde Yeşil Alan Yoksunluğu (%${indicators.builtUpDensity} Yapılaşma, %${indicators.greenSpaceRatio} Yeşil Alan)`;
  } else if (indicators.temperature >= 33) {
    recommendedId = 'green_corridors';
    priorityIssue = `Şiddetli Kentsel Isı Adası Etkisi (${indicators.temperature}°C Yüzey/Hava Sıcaklığı)`;
  } else if (indicators.greenSpaceRatio >= 16 && indicators.builtUpDensity <= 60) {
    recommendedId = 'protect_and_enhance';
    priorityIssue = `Mevcut Ekolojik Varlıkların Nitelik ve Geçirgenlik İyileştirme İhtiyacı`;
  } else {
    recommendedId = 'new_pocket_parks';
    priorityIssue = `Kentsel Isı ve Hava Kalitesinde Orta Düzey Risk Dengesi`;
  }

  const recScenario = SCENARIOS.find((s) => s.id === recommendedId) || SCENARIOS[1];
  const userChosenScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const currentStatus = `Kullanıcı girdisi / demo varsayımı olan göstergelere göre ortalama sıcaklık ${indicators.temperature}°C, trafik yoğunluğu %${indicators.trafficDensity} (${indicators.trafficLevel}), yapılaşma oranı %${indicators.builtUpDensity}, mevcut yeşil alan oranı %${indicators.greenSpaceRatio} ve NO₂ göstergesi ${indicators.no2Level} µg/m³ seviyesindedir. Varsayımsal model çıktısı olan Kentsel Çevresel Stres Skoru 100 üzerinden ${stress.stressScore} olarak hesaplanmış olup bölge model sınıflandırmasında '${stress.heatRiskLabel}' ve '${stress.airQualityLabel}' kategorisinde değerlendirilmektedir.`;

  // Kullanıcının seçtiği senaryonun analizi
  let evaluatedScenarioAssessment = '';
  if (selectedScenarioId === recommendedId) {
    evaluatedScenarioAssessment = `İncelediğiniz senaryo ("${userChosenScenario.title}"), modelin mevcut göstergeler ve varsayımsal demo katsayıları (-${userChosenScenario.tempReductionDemo}°C ısı, -%${userChosenScenario.no2ReductionDemo} NO₂, +%${userChosenScenario.greenIncreaseDemo} yeşil alan) üzerindeki öncelik analiziyle örtüşmektedir. Bu yaklaşım, tanımlanan öncelikli sorunu (${priorityIssue}) dengeli bir maliyet/etki varsayımıyla ele almayı hedefler; ancak öngörülen kazanımlar saha ölçümüyle doğrulanmış kesin sonuçlar değil, senaryo simülasyonu çıktılarıdır.`;
  } else {
    evaluatedScenarioAssessment = `İncelemekte olduğunuz "${userChosenScenario.title}" senaryosu varsayımsal model katsayılarına (-${userChosenScenario.tempReductionDemo}°C ısı, -%${userChosenScenario.no2ReductionDemo} NO₂, +%${userChosenScenario.greenIncreaseDemo} yeşil alan) göre belirli kazanımlar sunsa da, karar destek kuralları "${recScenario.title}" senaryosunu öne çıkarmaktadır. Bu karşılaştırma varsayımsal katsayılara dayalı bir model çıktısı olup, gerçek çevresel etki yerel saha verileriyle doğrulanmalıdır.`;
  }

  let alternativeComparison = '';
  if (recommendedId === 'green_corridors') {
    alternativeComparison = `• 1. Senaryo (Mevcut Alanları İyileştirme - Varsayımsal Katsayılar: -0.7°C ısı, -%8 NO₂, +%4 yeşil alan): Düşük maliyetli bir başlangıç sunsa da, varsayımsal model katsayılarına göre yüksek NO₂ (${indicators.no2Level} µg/m³) ve ısı baskısını azaltma potansiyeli sınırlı kalmaktadır.\n• 2. Senaryo (Yeni Cep Parkları - Varsayımsal Katsayılar: -1.8°C ısı, -%18 NO₂, +%12 yeşil alan): Lokal gölgeleme potansiyeli sunar; ancak süreksiz noktasal müdahalelerin hava akımı üzerindeki etkisi sınırlı olabilir.\n• 3. Senaryo (Önerilen Yeşil Koridor - Varsayımsal Katsayılar: -2.9°C ısı, -%32 NO₂, +%22 yeşil alan): Varsayımsal senaryo katsayılarına göre en yüksek azaltım potansiyeline sahiptir. Yeşil koridorların hava sirkülasyonunu destekleyerek kirletici dağılımını iyileştirebileceği olası bir mekanizmadır; ancak yerel rüzgâr verileri ve 3B bina geometrisi olmadan kentsel kanyon etkisi, kirleticilerin hapsolması veya NO₂ dağılımındaki iyileşme doğrulanmış bir gerçek değil, ileri analiz gerektiren bir hipotezdir.`;
  } else if (recommendedId === 'new_pocket_parks') {
    alternativeComparison = `• 1. Senaryo (Mevcut Alanları İyileştirme - Varsayımsal Katsayılar: -0.7°C ısı, -%8 NO₂, +%4 yeşil alan): Kullanıcı girdisi olan yeşil alan oranının (%${indicators.greenSpaceRatio}) düşük olduğu bu durumda, varsayımsal katsayılara göre mevcut alanları iyileştirmek yeşil açığını kapatmakta sınırlı kalabilir.\n• 3. Senaryo (Yeşil Koridor - Varsayımsal Katsayılar: -2.9°C ısı, -%32 NO₂, +%22 yeşil alan): Yüksek yapılaşma varsayımı (%${indicators.builtUpDensity}) altında kesintisiz koridor açmak yüksek maliyet gerektirir; ayrıca rüzgâr ve bina geometrisi verileri olmadan yeşil koridorların kirletici dağılımını iyileştireceği doğrulanmamış bir hipotezdir.\n• 2. Senaryo (Önerilen Cep Parkları - Varsayımsal Katsayılar: -1.8°C ısı, -%18 NO₂, +%12 yeşil alan): Varsayımsal model katsayılarına ve maliyet-etki dengesine göre, uygun parsellerde mikro yeşil alanlar oluşturmak en dengeli seçenektir; ancak hesaplanan etkiler kesin sonuç değil, varsayımsal projeksiyondur.`;
  } else {
    alternativeComparison = `• 2 ve 3. Senaryolar (Cep Parkları ve Yeşil Koridorlar): Daha yüksek varsayımsal azaltım katsayılarına sahip olsalar da yüksek bütçe ve yeni alan gerektirirler; ayrıca hava akımı ve NO₂ dağılımı üzerindeki etkileri yerel rüzgâr ve bina geometrisi verileri olmadan doğrulanmamış hipotez niteliğindedir.\n• 1. Senaryo (Önerilen Mevcut Alanları İyileştirme - Varsayımsal Katsayılar: -0.7°C ısı, -%8 NO₂, +%4 yeşil alan): Varsayımsal model eşiklerine göre mevcut %${indicators.greenSpaceRatio} yeşil dokunun korunup güçlendirilmesi en ekonomik başlangıç seçeneğidir.`;
  }

  const justification = `Bu öneri; kullanıcı girdisi / demo varsayımı olan ${indicators.temperature}°C sıcaklık, %${indicators.trafficDensity} trafik yoğunluğu, %${indicators.builtUpDensity} yapılaşma oranı ve %${indicators.greenSpaceRatio} yeşil alan oranı ile ${indicators.no2Level} µg/m³ NO₂ göstergesine ve önerilen senaryonun varsayımsal etki katsayılarına (-${recScenario.tempReductionDemo}°C ısı, -%${recScenario.no2ReductionDemo} NO₂, +%${recScenario.greenIncreaseDemo} yeşil alan) dayanmaktadır. Hesaplanan etkiler doğrulanmış kesin çevresel sonuçlar olmayıp, kentsel kanyon ve kirletici dağılım mekanizmaları rüzgâr ve bina geometrisi verileriyle ileri analiz gerektiren hipotezlerdir.`;

  const uncertaintiesAndDataGaps = [
    'Hâkim rüzgâr yönü/hızı ve 3B bina/sokak kanyon geometrisi ölçülmemiştir; bu nedenle kentsel kanyon etkisi, kirleticilerin hapsolması ve yeşil koridorların NO₂ dağılımını iyileştireceği yönündeki değerlendirmeler doğrulanmış gerçek değil, ileri analiz (CFD/mikroklima simülasyonu) gerektiren hipotezlerdir.',
    'Sıcaklık, trafik yoğunluğu, yapılaşma oranı ve yeşil alan oranı gerçek sensör veya envanter verisi olmayıp kullanıcı girdisi / demo varsayımıdır; senaryo karşılaştırmalarındaki azaltım oranları varsayımsal katsayılara dayanmaktadır.',
    'Yeraltı altyapı şebekeleri (su, elektrik, telekom) ile toprak geçirgenliği ve yerel hidrolojik veriler modele dahil edilmemiştir.',
    'Tekil istasyon ölçümleri (uygulandığında) yalnızca ilgili ölçüm noktasını temsil eder; tüm mahallelerin hava kalitesi için çok noktalı ölçüm ağı gereklidir.',
  ];

  return {
    currentStatus,
    priorityIssue,
    evaluatedScenarioTitle: userChosenScenario.title,
    evaluatedScenarioAssessment,
    recommendedScenarioId: recommendedId,
    recommendedScenarioTitle: recScenario.title,
    alternativeComparison,
    justification,
    uncertaintiesAndDataGaps,
    confidenceScore: 82,
    engineUsed: 'rule_based_fallback',
    engineLabel: 'Kural Tabanlı Karar Motoru (Yedek Mod - API Anahtarı Tanımsız/Pasif)',
    generatedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    inputSnapshot: {
      temperature: indicators.temperature,
      trafficDensity: indicators.trafficDensity,
      no2Level: indicators.no2Level,
      builtUpDensity: indicators.builtUpDensity,
      greenSpaceRatio: indicators.greenSpaceRatio,
      scenarioId: selectedScenarioId,
    },
  };
}

export interface AppliedRealNo2Context {
  station: string;
  date: string;
  value: number;
  unit: string;
}

/**
 * Mevcut generateRuleBasedAIAnalysis imzasını değiştirmeden,
 * kullanıcı tarafından uygulanmış gerçek NO₂ ölçümü varsa yedek analize
 * kaynak, kapsam ve sınırlılık bağlamını ekleyen yardımcı fonksiyon.
 */
export function applyRealDataContextToAnalysis(
  analysis: AIAnalysisResult,
  realNo2?: AppliedRealNo2Context | null
): AIAnalysisResult {
  if (!realNo2) {
    return analysis;
  }

  const formattedVal = Number(realNo2.value.toFixed(3));
  const realContextNote = ` (Veri Kaynağı ve Mekânsal Sınır Notu: NO₂ göstergesi Konya ${realNo2.station} İstasyonu'nun ${realNo2.date} tarihli ${formattedVal} ${realNo2.unit} gerçek istasyon verisinden aktarılmıştır. Sıcaklık, trafik yoğunluğu, yapılaşma oranı ve yeşil alan oranı gerçek veri kaynağından gelmeyen kullanıcı girdisi / demo varsayımıdır. ${realNo2.station} istasyonundaki bu tekil ölçüm yalnızca istasyon noktasını ve ${realNo2.date} gününü temsil eder; bütün mahallelerin hava kalitesi hakkında kesin sonuç çıkarmak için kullanılamaz.)`;

  const spatialLimitationGap = `Mekânsal Temsil Sınırı: Uygulanan gerçek NO₂ ölçümü (${formattedVal} ${realNo2.unit}) yalnızca ${realNo2.station} istasyonunun ${realNo2.date} tarihli noktasal istasyon verisidir; bütün mahallelerin veya tüm Konya'nın hava kalitesi hakkında kesin sonuç çıkarmak için genellenemez. Sıcaklık, trafik yoğunluğu, yapılaşma oranı ve yeşil alan oranı kaynak veride bulunmadığından kullanıcı girdisi / demo varsayımıdır.`;

  return {
    ...analysis,
    currentStatus: `${analysis.currentStatus}${realContextNote}`,
    justification: `${analysis.justification} Analizdeki NO₂ değeri ${realNo2.station} istasyonunun ${realNo2.date} tarihli (${formattedVal} ${realNo2.unit}) gerçek istasyon verisine dayanırken; sıcaklık, trafik yoğunluğu, yapılaşma oranı ve yeşil alan oranı kullanıcı girdisi / demo varsayımıdır ve senaryo karşılaştırmaları varsayımsal katsayılar üzerinden üretilmiştir.`,
    uncertaintiesAndDataGaps: [
      spatialLimitationGap,
      ...analysis.uncertaintiesAndDataGaps,
    ],
  };
}
