import React, { useState, useMemo, useEffect } from 'react';
import {
  TreePine,
  Thermometer,
  Car,
  Wind,
  Building2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
  ShieldAlert,
  Zap,
  Leaf,
  Scale,
  Compass,
  Copy,
  Check,
  HelpCircle,
  Cpu,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { UrbanIndicators, DistrictPreset, Scenario, ScenarioId, AIAnalysisResult } from './types.ts';
import { DISTRICT_PRESETS, SCENARIOS, SCHEMATIC_GRID, GridCell } from './data/presets.ts';
import {
  calculateUrbanStress,
  calculateProjectedImpact,
  generateRuleBasedAIAnalysis,
  applyRealDataContextToAnalysis,
} from './utils/calculator.ts';
import { loadKonyaData } from './data/konyaData.ts';

export default function App() {
  // Aktif seçilen veya düzenlenen göstergeler
  const [indicators, setIndicators] = useState<UrbanIndicators>(DISTRICT_PRESETS[0].indicators);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(DISTRICT_PRESETS[0].id);
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('new_pocket_parks');
  const [activeGridCoord, setActiveGridCoord] = useState<{ x: number; y: number } | null>({ x: 1, y: 1 });

  // AI Analiz Durumu ve API Durumu
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [showMethodologyInfo, setShowMethodologyInfo] = useState<boolean>(false);
  const [showApiSetupGuide, setShowApiSetupGuide] = useState<boolean>(false);
  const [hasServerApiKey, setHasServerApiKey] = useState<boolean | null>(null);

  // Gerçek Konya ölçümünün hangi indicators alanına uygulandığını izle
  // null → slider manuel değerde; dolu → gerçek istasyon ölçümü uygulandı
  const [realDataSources, setRealDataSources] = useState<{
    no2Level?: { station: string; date: string; value: number; unit: string };
  }>({});

  // Otomatik hesaplanan kentsel stres endeksi
  const stress = useMemo(() => calculateUrbanStress(indicators), [indicators]);

  // Seçili senaryonun dinamik etki hesaplaması
  const currentScenario = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0],
    [selectedScenarioId]
  );

  const projectedImpact = useMemo(
    () => calculateProjectedImpact(indicators, currentScenario),
    [indicators, currentScenario]
  );

  // Girdilerin mevcut analize göre değişip değişmediğini kontrol etme
  const isAnalysisOutdated = useMemo(() => {
    if (!aiAnalysis || !aiAnalysis.inputSnapshot) return false;
    const snap = aiAnalysis.inputSnapshot;
    return (
      snap.temperature !== indicators.temperature ||
      snap.trafficDensity !== indicators.trafficDensity ||
      snap.no2Level !== indicators.no2Level ||
      snap.builtUpDensity !== indicators.builtUpDensity ||
      snap.greenSpaceRatio !== indicators.greenSpaceRatio ||
      snap.scenarioId !== selectedScenarioId
    );
  }, [indicators, selectedScenarioId, aiAnalysis]);

const [konyaData, setKonyaData] = useState<any>(null);
const [konyaDataError, setKonyaDataError] = useState<string | null>(null);

const [selectedAirStation, setSelectedAirStation] = useState('Bosna');
const [selectedAirDate, setSelectedAirDate] = useState('2025-01-01');


const selectedAirRecord = (konyaData?.air_quality_daily ?? []).find(
  (record: any) =>
    record.station === selectedAirStation &&
    record.date === selectedAirDate
);


useEffect(() => {
  loadKonyaData()
    .then((data) => {
      setKonyaData(data);
      setKonyaDataError(null);
      console.log('Konya verileri yüklendi:', {
        alanlar: Object.keys(data),
        havaKalitesiKayitSayisi: data.air_quality_daily?.length,
        mahalleKayitSayisi: data.neighborhood_statistics?.length,
      });
    })
    .catch((error) => {
      console.error('Konya verileri yüklenemedi:', error);
      setKonyaDataError(error.message || 'Veri yüklenemedi.');
    });
}, []);

  // Sunucu API durumunu kontrol et; anahtar aktifse başlangıçta canlı Gemini analizini de tetikle
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        const keyActive = !!data.hasGeminiApiKey;
        setHasServerApiKey(keyActive);
        if (keyActive) {
          runAIAnalysis();
        }
      })
      .catch(() => {
        setHasServerApiKey(false);
      });
  }, []);

  // Gösterge güncelleme yardımcıları
  const handleIndicatorChange = (key: keyof UrbanIndicators, value: number) => {
    setIndicators((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'trafficDensity') {
        if (value > 75) updated.trafficLevel = 'Kritik';
        else if (value > 55) updated.trafficLevel = 'Yüksek';
        else if (value > 35) updated.trafficLevel = 'Orta';
        else updated.trafficLevel = 'Düşük';
      }
      return updated;
    });
    // Kullanıcı slider'ı manuel hareket ettirirse ilgili gerçek veri kaynağını sıfırla
    if (key === 'no2Level') {
      setRealDataSources((prev) => ({ ...prev, no2Level: undefined }));
    }
    setSelectedDistrictId('custom');
    setActiveGridCoord(null);
  };

  // Kaynak verideki NO₂ birimi doğrulaması ve geçerlilik kontrolü
  const sourceNo2Unit = (konyaData?.metadata?.units as Record<string, string> | undefined)?.NO2 ?? 'µg/m³';
  const isNo2UnitVerified =
    !konyaData || sourceNo2Unit === 'µg/m³' || sourceNo2Unit === 'mg/m³';
  const no2ConversionFactor = sourceNo2Unit === 'mg/m³' ? 1000 : 1;

  const rawSelectedNo2 = selectedAirRecord?.NO2;
  const isValidSelectedNo2 =
    rawSelectedNo2 !== null &&
    rawSelectedNo2 !== undefined &&
    typeof rawSelectedNo2 === 'number' &&
    Number.isFinite(rawSelectedNo2) &&
    rawSelectedNo2 > 0;

  // Gerçek Konya NO₂ ölçümünü kullanıcı onayıyla indicators'a uygula
  const handleApplyRealNo2 = () => {
    if (!selectedAirRecord || !isValidSelectedNo2 || !isNo2UnitVerified) {
      return;
    }
    const convertedValue = Number(((rawSelectedNo2 as number) * no2ConversionFactor).toFixed(3));
    setIndicators((prev) => ({ ...prev, no2Level: convertedValue }));
    setRealDataSources((prev) => ({
      ...prev,
      no2Level: {
        station: selectedAirStation,
        date: selectedAirDate,
        value: convertedValue,
        unit: 'µg/m³',
      },
    }));
    setSelectedDistrictId('custom');
    setActiveGridCoord(null);
  };

  const handleSelectPreset = (preset: DistrictPreset) => {
    setSelectedDistrictId(preset.id);
    setIndicators({ ...preset.indicators });
    setRealDataSources({});
    setActiveGridCoord(null);
  };

  const handleSelectGridCell = (cell: GridCell) => {
    setActiveGridCoord({ x: cell.x, y: cell.y });
    setSelectedDistrictId('grid_cell');
    setRealDataSources({});
    setIndicators({
      temperature: cell.temp,
      trafficDensity: cell.traffic,
      trafficLevel: cell.traffic > 75 ? 'Yüksek' : cell.traffic > 40 ? 'Orta' : 'Düşük',
      no2Level: cell.no2,
      builtUpDensity: cell.builtUp,
      greenSpaceRatio: cell.green,
    });
  };

  // AI Analizini Çalıştırma (Gemini veya Kural Tabanlı Yedek)
  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicators,
          selectedScenarioId,
          selectedScenarioTitle: currentScenario.title,
          // Gerçek Konya ölçümü uygulandıysa kaynak bağlamını da gönder
          realDataContext: realDataSources.no2Level
            ? {
                hasRealMeasurement: true,
                measurementAvailable: true,
                no2Source: `Konya ${realDataSources.no2Level.station} İstasyonu ${realDataSources.no2Level.date} tarihli günlük ortalama NO₂ ölçümü: ${realDataSources.no2Level.value.toFixed(3)} ${realDataSources.no2Level.unit}`,
                appliedNo2Value: realDataSources.no2Level.value,
                value: realDataSources.no2Level.value,
                station: realDataSources.no2Level.station,
                measurementDate: realDataSources.no2Level.date,
                date: realDataSources.no2Level.date,
                unit: realDataSources.no2Level.unit,
                dataNote: 'Sıcaklık, trafik yoğunluğu, yapılaşma yoğunluğu ve yeşil alan oranı kullanıcı tarafından girilmiş örnek değerlerdir; gerçek ölçüm değildir.',
              }
            : null,
        }),
      });

      const json = await res.json();

      if (json.geminiActive && json.data) {
        // Gerçek Gemini modeli yanıtı (birincil gemini-3.8-flash veya alternatif gemini-2.5-flash)
        const usedModel =
          typeof json.modelUsed === 'string' && json.modelUsed.trim()
            ? json.modelUsed.trim()
            : 'gemini-3.8-flash';
        const activeEngineLabel =
          usedModel === 'gemini-3-flash-preview'
            ? 'Google Gemini 3 Flash Preview (gemini-3-flash-preview · Aktif Yapay Zekâ Analizi)'
            : usedModel === 'gemini-2.5-flash'
            ? 'Google Gemini 2.5 Flash (gemini-2.5-flash · Aktif Yapay Zekâ Analizi)'
            : usedModel === 'gemini-3.8-flash'
            ? 'Google Gemini 3.8 Flash (gemini-3.8-flash · Aktif Yapay Zekâ Analizi)'
            : `Google Gemini (${usedModel} · Aktif Yapay Zekâ Analizi)`;
        setFallbackNotice(null);
        const rawGeminiAnalysis: AIAnalysisResult = {
          currentStatus: json.data.currentStatus,
          priorityIssue: json.data.priorityIssue,
          evaluatedScenarioTitle: currentScenario.title,
          evaluatedScenarioAssessment: json.data.evaluatedScenarioAssessment,
          recommendedScenarioId: json.data.recommendedScenarioId as ScenarioId,
          recommendedScenarioTitle: json.data.recommendedScenarioTitle,
          alternativeComparison: json.data.alternativeComparison,
          justification: json.data.justification,
          uncertaintiesAndDataGaps: json.data.uncertaintiesAndDataGaps,
          confidenceScore: json.data.confidenceScore || 88,
          engineUsed: 'gemini',
          engineLabel: activeEngineLabel,
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
        const finalGeminiAnalysis =
          realDataSources.no2Level &&
          (!String(rawGeminiAnalysis.currentStatus || '').includes(realDataSources.no2Level.station) ||
            !String(rawGeminiAnalysis.currentStatus || '').includes(realDataSources.no2Level.date))
            ? applyRealDataContextToAnalysis(rawGeminiAnalysis, realDataSources.no2Level)
            : rawGeminiAnalysis;
        setAiAnalysis(finalGeminiAnalysis);
      } else {
        // Gerçek API anahtarı yoksa veya hata alındıysa kural tabanlı motor devreye girer
        const fallback = applyRealDataContextToAnalysis(
          generateRuleBasedAIAnalysis(indicators, selectedScenarioId),
          realDataSources.no2Level
        );
        if (json.reason === 'missing_key') {
          setFallbackNotice(null);
        } else {
          const code = typeof json.statusCode === 'number' ? json.statusCode : null;
          if (code === 503 || json.errorCategory === 'service_unavailable') {
            fallback.engineLabel = 'Kural Tabanlı Karar Motoru (Yedek Mod - Gemini Servisi Yoğun [503])';
            setFallbackNotice('Gemini servisi şu anda yoğun. Geçici olarak kural tabanlı karar motoru kullanılıyor.');
          } else if (code === 429 || json.errorCategory === 'rate_limit') {
            fallback.engineLabel = 'Kural Tabanlı Karar Motoru (Yedek Mod - Kota/Hız Sınırı [429])';
            setFallbackNotice('Gemini API kota veya hız sınırına (429) ulaşıldı. Geçici olarak kural tabanlı karar motoru kullanılıyor.');
          } else {
            fallback.engineLabel = `Kural Tabanlı Karar Motoru (Yedek Mod - Gemini Bağlantı Hatası${code ? ` [${code}]` : ''})`;
            setFallbackNotice(
              `Gemini servisiyle iletişim kurulurken bir bağlantı hatası oluştu${code ? ` (Kod: ${code})` : ''}. Geçici olarak kural tabanlı karar motoru kullanılıyor.`
            );
          }
        }
        setAiAnalysis(fallback);
      }
    } catch {
      // Ağ hatası veya endpoint erişilemezliği durumunda kural tabanlı yedek motor
      const fallback = applyRealDataContextToAnalysis(
        generateRuleBasedAIAnalysis(indicators, selectedScenarioId),
        realDataSources.no2Level
      );
      fallback.engineLabel = 'Kural Tabanlı Karar Motoru (Yedek Mod - Gemini Bağlantı Hatası)';
      setFallbackNotice('Gemini servisiyle iletişim kurulurken bir bağlantı hatası oluştu. Geçici olarak kural tabanlı karar motoru kullanılıyor.');
      setAiAnalysis(fallback);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Karar Özetini Panoya Kopyalama
  const handleCopySummary = () => {
    if (!aiAnalysis) return;
    const realNo2Summary = realDataSources.no2Level
      ? `Konya ${realDataSources.no2Level.station} İstasyonu · ${realDataSources.no2Level.date} · ${realDataSources.no2Level.value} ${realDataSources.no2Level.unit} NO₂ (gerçek istasyon verisi; yalnızca bu istasyon noktasını temsil eder, bütün mahallelerin hava kalitesi hakkında kesin sonuç çıkarmak için genellenemez)`
      : 'Uygulanmadı (NO₂ göstergesi kullanıcı girdisi / demo varsayımıdır)';
    const text = `URBAN GREEN INTELLIGENCE - KENTSEL KARAR DESTEK RAPORU
Tarih: ${aiAnalysis.generatedAt} | Motor: ${aiAnalysis.engineLabel}
İncelenen Senaryo: ${aiAnalysis.evaluatedScenarioTitle || currentScenario.title}

VERİ NİTELİĞİ VE BİLİMSEL SINIR ÖZETİ:
- Gerçek İstasyon Verisi: ${realNo2Summary}
- Kullanıcı Girdisi / Demo Varsayımı: Ortalama Sıcaklık (${indicators.temperature}°C), Trafik Yoğunluğu (%${indicators.trafficDensity}), Yapılaşma Oranı (%${indicators.builtUpDensity}), Mevcut Yeşil Alan Oranı (%${indicators.greenSpaceRatio})
- Varsayımsal Model Çıktısı ve Hipotezler: Kentsel Çevresel Stres Skoru (${stress.stressScore}/100) ve senaryo karşılaştırma katsayıları (-${currentScenario.tempReductionDemo}°C ısı, -%${currentScenario.no2ReductionDemo} NO₂, +%${currentScenario.greenIncreaseDemo} yeşil alan) varsayımsal model çıktılarıdır. Rüzgâr verileri ve bina geometrisi bulunmadan değerlendirilen kentsel kanyon etkisi ve kirletici dağılım mekanizmaları doğrulanmış gerçek değil, ileri analiz gerektiren hipotezlerdir.

1. BÖLGENİN MEVCUT DURUMU:
${aiAnalysis.currentStatus}

2. ÖNCELİKLİ ÇEVRESEL SORUN:
${aiAnalysis.priorityIssue}

3. İNCELENEN SENARYONUN DEĞERLENDİRMESİ:
${aiAnalysis.evaluatedScenarioAssessment || 'Doğrudan değerlendirme yapıldı.'}

4. MODELİN ÖNERDİĞİ MÜDAHALE:
${aiAnalysis.recommendedScenarioTitle}

5. ALTERNATİF SENARYOLARLA KARŞILAŞTIRMA:
${aiAnalysis.alternativeComparison}

6. GEREKÇE:
${aiAnalysis.justification}

7. BELİRSİZLİKLER VE EKSİK VERİLER:
${aiAnalysis.uncertaintiesAndDataGaps.map((item) => `- ${item}`).join('\n')}

*Bu rapor Climathon 2026 kentsel yeşil alan karar destek prototipi tarafından üretilmiştir. Etki değerleri varsayımsal demo katsayılarıdır; doğrulanmamış çevresel etkiler kesin sonuç olarak değerlendirilmemelidir.`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  // İlk yüklemede başlangıç analizini hazırla
  useEffect(() => {
    const initialFallback = generateRuleBasedAIAnalysis(indicators, selectedScenarioId);
    setAiAnalysis(initialFallback);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-20">
      {/* ÜST BİLGİ VE BAŞLIK ÇUBUĞU */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20">
              <TreePine className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  Urban Green Intelligence
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Climathon MVP
                </span>
              </div>
              <p className="text-xs text-slate-600">
                AI Destekli Kentsel Yeşil Alan Karar Destek Sistemi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* API Durum Rozeti */}
            <div
              className={`flex items-center px-2.5 py-1 rounded-full text-xs border ${
                hasServerApiKey
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  hasServerApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              ></span>
              <span className="font-medium text-[11px]">
                {hasServerApiKey
                  ? aiAnalysis?.engineUsed === 'gemini' && aiAnalysis.engineLabel.includes('gemini-3-flash-preview')
                    ? 'Gemini 3 Flash Preview Aktif'
                    : aiAnalysis?.engineUsed === 'gemini' && aiAnalysis.engineLabel.includes('gemini-2.5-flash')
                    ? 'Gemini 2.5 Flash Aktif'
                    : 'Gemini 3.8 Flash Aktif'
                  : 'Kural Tabanlı Yedek Mod'}
              </span>
            </div>

            <button
              onClick={() => setShowApiSetupGuide(!showApiSetupGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
              title="Gemini API Entegrasyon Durumu & Kurulumu"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              API Bilgisi
            </button>

            <button
              onClick={() => setShowMethodologyInfo(!showMethodologyInfo)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-[#ecfdf6] hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Metodoloji
            </button>
          </div>
        </div>
      </header>


      {/* KONYA GERÇEK VERİLERİ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Konya Gerçek Verileri
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                2025 hava kalitesi ölçümleri ve 2024 mahalle istatistikleri
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              {konyaData ? 'Veriler yüklendi' : 'Veriler yükleniyor'}
            </span>
          </div>

          {konyaDataError && (
            <p className="text-sm text-red-600">
              Veri yükleme hatası: {konyaDataError}
            </p>
          )}

          {konyaData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-slate-600">
                    Günlük hava kalitesi kayıtları
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {konyaData.air_quality_daily?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    İstasyon bazlı ölçümler
                  </p>
                </div>

                <div className="rounded-xl bg-teal-50 p-4">
                  <p className="text-sm text-slate-600">
                    Mahalle istatistik kayıtları
                  </p>
                  <p className="text-2xl font-bold text-teal-800">
                    {konyaData.neighborhood_statistics?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    2024 kaynaklı istatistikler
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <label className="text-sm font-medium text-slate-700">
                  İstasyon
                  <select
                    id="konya-station-filter"
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 bg-white"
                   value={selectedAirStation}
                    onChange={(e) => setSelectedAirStation(e.target.value)}
                  >
                    <option value="Bosna">Bosna</option>
                    <option value="Meram">Meram</option>
                    <option value="Karatay">Karatay</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Tarih
                  <select
                    id="konya-date-filter"
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 bg-white"
                    value={selectedAirDate}
                    onChange={(e) => setSelectedAirDate(e.target.value)}
                  >
                    {(konyaData?.air_quality_daily ?? [])
                      .map((record: any) => record.date)
                      .filter((date: string, index: number, dates: string[]) =>
                        dates.indexOf(date) === index
                      )
                      .sort()
                      .map((date: string) => (
                        <option key={date} value={date}>{date}</option>
                      ))}
                  </select>
                </label>
              </div>

              <h3 className="font-semibold text-slate-800 mb-3">
                Hava kalitesi ölçümlerinden örnekler
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">İstasyon</th>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">NO₂ (µg/m³)</th>
                      <th className="p-3">PM10 (µg/m³)</th>
                    </tr>
                  </thead>
                  <tbody>
                    
                      {(konyaData.air_quality_daily ?? [])
                      .filter(
                        (record: any) =>
                          record.station === selectedAirStation &&
                          record.date === selectedAirDate
                      )
                      .map(

                      (record: any, index: number) => (
                        <tr key={`${record.station}-${record.date}-${index}`}
                            className="border-t border-slate-100">
                          <td className="p-3">{record.station}</td>
                          <td className="p-3">{record.date}</td>
                          <td className="p-3">
                            {record.NO2 ?? 'Ölçüm yok'}
                          </td>
                          <td className="p-3">
                            {record.PM10 ?? 'Ölçüm yok'}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold text-emerald-900">Seçilen Kayıt:</span>{' '}
                    <span>{selectedAirStation} İstasyonu · {selectedAirDate}</span>{' '}
                    <span className="font-bold text-emerald-800">
                      ({isValidSelectedNo2
                        ? `${Number(((rawSelectedNo2 as number) * no2ConversionFactor).toFixed(3))} µg/m³`
                        : 'NO₂ ölçümü yok'})
                    </span>
                  </div>
                  {realDataSources.no2Level && (
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-emerald-800">Panelde Aktif Gerçek Ölçüm:</span>{' '}
                      {realDataSources.no2Level.station} · {realDataSources.no2Level.date} ({realDataSources.no2Level.value} {realDataSources.no2Level.unit})
                      {(realDataSources.no2Level.station !== selectedAirStation ||
                        realDataSources.no2Level.date !== selectedAirDate) && (
                        <span className="ml-1.5 text-amber-800 font-medium">
                          {isValidSelectedNo2
                            ? `· Yeni seçimle fark: ${
                                (rawSelectedNo2 as number) * no2ConversionFactor - realDataSources.no2Level.value >= 0
                                  ? '+'
                                  : ''
                              }${(
                                (rawSelectedNo2 as number) * no2ConversionFactor -
                                realDataSources.no2Level.value
                              ).toFixed(2)} µg/m³ (Henüz uygulanmadı)`
                            : '· Yeni seçilen kayıtta ölçüm yok; önceki uygulanmış değer korunuyor'}
                        </span>
                      )}
                    </div>
                  )}
                  {!isValidSelectedNo2 && (
                    <div className="text-[11px] text-amber-800">
                      Seçilen istasyon ve tarihte geçerli NO₂ ölçümü bulunmadığından mevcut gösterge değeri ({indicators.no2Level} µg/m³) korundu.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleApplyRealNo2}
                  disabled={!isValidSelectedNo2 || !isNo2UnitVerified}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                    isValidSelectedNo2 && isNo2UnitVerified
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Gerçek NO₂ değerini uygula
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-4">
                Kaynak: 2025 hava kalitesi istasyon kayıtları ve 2024 mahalle
                istatistikleri. Eksik ölçümler sıfır olarak değerlendirilmez.
                Senaryo etkileri bu ölçümlerden doğrulanmış tahminler değildir.
              </p>
            </>
          )}
        </div>
      </section>


      {/* GEMINI API BİLGİLENDİRME VE ENTEGRASYON REHBERİ PANELİ */}
      {showApiSetupGuide && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-xl p-4 text-xs shadow-md relative">
            <button
              onClick={() => setShowApiSetupGuide(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-white">
                Google Gemini API Entegrasyonu & Güvenlik Çerçevesi
              </h4>
            </div>
            <p className="text-slate-300 mb-3">
              Bu prototip, kentsel göstergeleri ve karar vericinin seçtiği yeşil alan senaryosunu güvenli bir sunucu rotası
              (<code>/api/ai-analyze</code>) üzerinden doğrudan <strong>Google Gemini 3.8 Flash</strong> modeline iletir.
              API anahtarları hiçbir zaman tarayıcıya veya istemci kaynak koduna maruz bırakılmaz.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="font-semibold text-emerald-400 block mb-1">
                  1. Gerçek Gemini Analizi Modu:
                </span>
                AI Studio Secrets paneline <code>GEMINI_API_KEY</code> tanımlandığında, model bölge göstergelerini serbest
                doğal dille yorumlar, seçili senaryoyu ve alternatifleri dinamik olarak gerekçelendirir.
              </div>
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="font-semibold text-amber-400 block mb-1">
                  2. Kural Tabanlı Yedek Analiz Modu:
                </span>
                API anahtarı bulunmadığında sistem bozulmaz; kentsel stres matrisine ve çevre eşiklerine dayalı çalışan
                deterministik karar motorunu devreye sokar ve bunu arayüzde şeffaf biçimde belirtir.
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
              <span>Mevcut Durum: {hasServerApiKey ? '🟢 Gemini API anahtarı algılandı.' : '🟡 API anahtarı tanımlanmamış, kural tabanlı yedek motor çalışmaktadır.'}</span>
              <span className="text-slate-500">Model: gemini-3.8-flash</span>
            </div>
          </div>
        </div>
      )}

      {/* METODOLOJİ VE VERİ NOTU AÇILIR PANELİ */}
      {showMethodologyInfo && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 relative">
            <button
              onClick={() => setShowMethodologyInfo(false)}
              className="absolute top-3 right-3 text-emerald-600 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
            <h4 className="font-bold text-sm mb-1 text-emerald-950 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-700" />
              Climathon Prototip Veri & Karar Destek Çerçevesi
            </h4>
            <p className="mb-2">
              Bu sistem; kentsel ısı adası, trafik yoğunluğu, NO₂ hava kirliliği ve yapılaşma baskısı altındaki
              şehirlerde <strong>doğa temelli çözümleri (NBS)</strong> optimize etmek üzere tasarlanmıştır.
            </p>
            <ul className="list-disc list-inside space-y-1 text-emerald-800">
              <li>
                <strong>Veri Niteliği:</strong> Arayüzde yer alan değerler, prototipi test etmek ve karar destek
                akışını somutlaştırmak amacıyla üretilmiş <strong>örnek/varsayımsal verilerdir</strong>. Gerçek sensör bağlantısı içermez.
              </li>
              <li>
                <strong>Yapay Zekânın Rolü:</strong> Yapay zekâ nihai şehir planlama kararı vermez; çok değişkenli
                çevresel göstergeleri sentezler, müdahale alternatiflerini gerekçelendirir ve veri belirsizliklerini açıklar.
              </li>
              <li>
                <strong>Yedek Analiz Güvencesi:</strong> Gerçek Gemini API bağlantısı kurulamadığında sistem şeffaf biçimde
                kural tabanlı karar motorunu çalıştırır ve bunu arayüzde açıkça belirtir. Asla sahte AI iddiasında bulunmaz.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* UYARI BANDI: ÖRNEK VERİ VE BİLİMSEL BELİRSİZLİK BİLDİRİMİ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl px-4 py-2.5 flex items-center gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <strong>Metodolojik Uyarı:</strong> Göstergeler, sıcaklık azalım projeksiyonları (-0.7°C, -1.8°C, -2.9°C) ve NO₂
            filtreleme oranları prototip karar destek mekanizmasını sergilemek amacıyla hazırlanmış <em>varsayımsal simülasyon katsayılarıdır</em>;
            bilimsel olarak doğrulanmış kesin ölçüm veya etki tahmini olarak değerlendirilmemelidir.
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-200/60 font-semibold text-amber-900">
            Varsayımsal Demo Modu
          </span>
        </div>
      </div>

      {/* ANA DÜZEN */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SOL VE ORTA ALAN: GÖSTERGELER & BÖLGE SEÇİMİ (7 Kolon) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. ETKİLEŞİMLİ BÖLGE SEÇİMİ VE ŞEMATİK MATRİS */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    1. Örnek Kentsel Bölge Seçimi
                  </h2>
                </div>
                <span className="text-xs text-slate-600">
                  Hazır bir bölge seçin veya haritadan tıklayın
                </span>
              </div>

              {/* Hızlı Seçim Presetleri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {DISTRICT_PRESETS.map((preset) => {
                  const isSelected = selectedDistrictId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isSelected
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mb-2">
                        {preset.category}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-700">
                        <span>🌡️ {preset.indicators.temperature}°C</span>
                        <span>•</span>
                        <span>🚗 %{preset.indicators.trafficDensity}</span>
                        <span>•</span>
                        <span>🌳 %{preset.indicators.greenSpaceRatio}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Şematik Bölge Matrisi (Kentsel Hücreler) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Şematik Kentsel Mikroklima Matrisi (4×4 Grid)
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Farklı bir mikro-bölgeye tıklayın
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {SCHEMATIC_GRID.map((cell) => {
                    const isCellActive =
                      activeGridCoord?.x === cell.x && activeGridCoord?.y === cell.y;
                    
                    let bgClass = 'bg-amber-100 border-amber-300 text-amber-900';
                    if (cell.green > 30) {
                      bgClass = 'bg-emerald-100 border-emerald-300 text-emerald-900';
                    } else if (cell.temp >= 33) {
                      bgClass = 'bg-rose-100 border-rose-300 text-rose-900';
                    } else if (cell.no2 >= 60) {
                      bgClass = 'bg-orange-100 border-orange-300 text-orange-900';
                    }

                    return (
                      <button
                        key={`${cell.x}-${cell.y}`}
                        onClick={() => handleSelectGridCell(cell)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${bgClass} ${
                          isCellActive
                            ? 'ring-2 ring-emerald-700 shadow-md scale-[1.02]'
                            : 'hover:opacity-90'
                        }`}
                      >
                        <div className="text-[10px] font-bold line-clamp-1">{cell.name}</div>
                        <div className="flex items-center justify-between mt-1 text-[9px] font-medium opacity-90">
                          <span>{cell.temp}°C</span>
                          <span>🌳 %{cell.green}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/80 text-[10px] text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-rose-400"></span> Isı Adası
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-orange-400"></span> NO₂ Emisyonu
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-emerald-400"></span> Yeşil Koruluk
                    </span>
                  </div>
                  {activeGridCoord && (
                    <span className="font-semibold text-emerald-700">
                      Seçili Hücre: ({activeGridCoord.x + 1}, {activeGridCoord.y + 1})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. KENTSEL DURUM PANELİ VE CANLI PARAMETRE AYARLARI */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    2. Kentsel Çevresel Göstergeler (Canlı Değerler)
                  </h2>
                </div>
                <button
                  onClick={() => handleSelectPreset(DISTRICT_PRESETS[0])}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Varsayılana Sıfırla
                </button>
              </div>

              {/* 5 Temel Gösterge Kartları */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {/* 1. Sıcaklık */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative overflow-hidden">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Ortalama Sıcaklık</span>
                    <Thermometer className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {indicators.temperature.toFixed(1)}
                    <span className="text-sm font-medium text-slate-500 ml-0.5">°C</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        indicators.temperature >= 33
                          ? 'bg-rose-100 text-rose-800'
                          : indicators.temperature >= 30
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {stress.heatRiskLabel}
                    </span>
                    <span className="text-[9px] text-slate-600">(Örnek)</span>
                  </div>
                </div>

                {/* 2. Trafik Yoğunluğu */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Trafik Yoğunluğu</span>
                    <Car className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    %{indicators.trafficDensity}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-600">
                    Düzey: <strong className="text-slate-800">{indicators.trafficLevel}</strong>
                  </div>
                </div>

                {/* 3. NO2 Göstergesi */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>NO₂ Göstergesi</span>
                    <Wind className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {indicators.no2Level}
                    <span className="text-xs font-normal text-slate-500 ml-1">µg/m³</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-600">
                    <span>DSÖ Kılavuz: <strong>25 µg/m³</strong></span>
                    {realDataSources.no2Level ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        Gerçek: {realDataSources.no2Level.station} ({realDataSources.no2Level.date})
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">(Örnek/Manuel)</span>
                    )}
                  </div>
                </div>

                {/* 4. Yapılaşma Yoğunluğu */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Yapılaşma Yoğunluğu</span>
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    %{indicators.builtUpDensity}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-600">
                    Geçirimsiz yüzey & beton
                  </div>
                </div>

                {/* 5. Mevcut Yeşil Alan Oranı */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Mevcut Yeşil Alan</span>
                    <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-800 tracking-tight">
                    %{indicators.greenSpaceRatio}
                  </div>
                  <div className="mt-1 text-[10px]">
                    <span
                      className={`font-semibold ${
                        indicators.greenSpaceRatio <= 8
                          ? 'text-rose-600'
                          : indicators.greenSpaceRatio <= 15
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {stress.deficitLabel}
                    </span>
                  </div>
                </div>

                {/* Kentsel Çevresel Stres Skoru (Bileşik) */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3 col-span-2 sm:col-span-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div>
                    <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Bileşik Kentsel Çevresel Stres Skoru
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Sıcaklık, NO₂, yapılaşma ve yeşil alan eksikliği ağırlıklı indeksi
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">
                        {stress.stressScore}
                        <span className="text-xs text-slate-400 font-normal"> / 100</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {stress.stressScore >= 75
                          ? 'Kritik Risk'
                          : stress.stressScore >= 50
                          ? 'Yüksek Stres'
                          : 'Orta Düzey'}
                      </div>
                    </div>
                    <div className="w-16 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          stress.stressScore >= 75
                            ? 'bg-rose-500'
                            : stress.stressScore >= 50
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${stress.stressScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Etkileşimli Değer Değiştiriciler (Sliders) */}
              <div className="border-t border-slate-200/80 pt-4">
                <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  Göstergeleri Canlı Olarak Değiştirin (Etkiyi Anında Görün):
                </h3>

                <div className="space-y-3.5">
                  {/* Sıcaklık Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Ortalama Sıcaklık (°C)</span>
                      <span className="font-bold text-slate-900">{indicators.temperature.toFixed(1)} °C</span>
                    </div>
                    <input
                      type="range"
                      min="22"
                      max="40"
                      step="0.2"
                      value={indicators.temperature}
                      onChange={(e) => handleIndicatorChange('temperature', parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                      <span>22°C (Ilıman)</span>
                      <span>31°C (Isı Adası)</span>
                      <span>40°C (Aşırı)</span>
                    </div>
                  </div>

                  {/* Trafik Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Trafik Yoğunluğu (%)</span>
                      <span className="font-bold text-slate-900">%{indicators.trafficDensity}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={indicators.trafficDensity}
                      onChange={(e) => handleIndicatorChange('trafficDensity', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>


                        {/* Seçilen istasyonun gerçek NO₂ ölçümü — Kullanıcı Onaylı Aktarım Paneli */}
                        {(() => {
                          const rawNo2 = rawSelectedNo2;
                          const isValidMeasurement = isValidSelectedNo2;
                          const convertedSelectedNo2 = isValidMeasurement
                            ? Number(((rawNo2 as number) * no2ConversionFactor).toFixed(3))
                            : null;
                          // Bu seçilen kayıt zaten uygulanmış mı?
                          const isCurrentlyApplied =
                            realDataSources.no2Level !== undefined &&
                            realDataSources.no2Level.station === selectedAirStation &&
                            realDataSources.no2Level.date === selectedAirDate;
                          // Farklı bir gerçek kayıt daha önce uygulanmış mı?
                          const isDifferentApplied =
                            realDataSources.no2Level !== undefined && !isCurrentlyApplied;

                          return (
                            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-emerald-900">
                                  Seçilen İstasyonun Gerçek NO₂ Ölçümü
                                </p>
                                <span className="text-[10px] text-emerald-700 font-medium">
                                  Birim: {sourceNo2Unit} · Günlük Ort.
                                </span>
                              </div>

                              {/* Ölçüm değeri */}
                              <div className="flex items-baseline gap-2">
                                {isValidMeasurement && convertedSelectedNo2 !== null ? (
                                  <p className="text-xl font-black text-emerald-800">
                                    {convertedSelectedNo2}
                                    <span className="text-sm font-normal text-emerald-700 ml-1">µg/m³</span>
                                  </p>
                                ) : (
                                  <p className="text-sm font-medium text-slate-600 italic">
                                    {rawNo2 === null || rawNo2 === undefined
                                      ? 'Bu istasyon ve tarih için NO₂ ölçümü bulunmuyor (Ölçüm yok)'
                                      : rawNo2 === 0
                                      ? 'Sıfır değer — geçersiz/eksik ölçüm olarak işaretlendi'
                                      : 'Geçersiz ölçüm değeri'}
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-emerald-700">
                                {selectedAirStation} İstasyonu · {selectedAirDate} · Birim: µg/m³
                              </p>

                              {!isNo2UnitVerified && (
                                <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                                  Kaynak verideki NO₂ birimi ({sourceNo2Unit}) doğrulanamadığından otomatik veya manuel aktarım engellendi.
                                </div>
                              )}

                              {/* Farklı bir kayıt daha önce uygulandı uyarısı ve fark gösterimi */}
                              {isDifferentApplied && (
                                <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 space-y-1">
                                  <div>
                                    ⚠️ <strong>Aktif Uygulanmış Ölçüm:</strong>{' '}
                                    {realDataSources.no2Level!.station} · {realDataSources.no2Level!.date} ({realDataSources.no2Level!.value} {realDataSources.no2Level!.unit})
                                  </div>
                                  <div>
                                    <strong>Yeni Seçilen Kayıt (Henüz Uygulanmadı):</strong>{' '}
                                    {selectedAirStation} · {selectedAirDate} (
                                    {isValidMeasurement && convertedSelectedNo2 !== null
                                      ? `${convertedSelectedNo2} µg/m³ · Fark: ${
                                          convertedSelectedNo2 - realDataSources.no2Level!.value >= 0 ? '+' : ''
                                        }${(convertedSelectedNo2 - realDataSources.no2Level!.value).toFixed(2)} µg/m³`
                                      : 'Ölçüm yok'}
                                    )
                                  </div>
                                </div>
                              )}

                              {isCurrentlyApplied && (
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Bu kayıt ({realDataSources.no2Level!.station} · {realDataSources.no2Level!.date} · {realDataSources.no2Level!.value} {realDataSources.no2Level!.unit}) gösterge paneline uygulandı.
                                </div>
                              )}

                              {!isValidMeasurement && (
                                <p className="text-[11px] text-slate-600 italic">
                                  Geçerli ölçüm bulunmadığından slider değeri ({indicators.no2Level} µg/m³) değiştirilmedi.
                                </p>
                              )}

                              {/* Kullanıcı onaylı aktarım butonu */}
                              <button
                                id="apply-real-no2-btn"
                                type="button"
                                onClick={handleApplyRealNo2}
                                disabled={!isValidMeasurement || !isNo2UnitVerified}
                                className={`w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                                  isValidMeasurement && isNo2UnitVerified
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                Gerçek NO₂ değerini uygula
                                {isValidMeasurement && convertedSelectedNo2 !== null
                                  ? ` (${convertedSelectedNo2} µg/m³)`
                                  : ' (Ölçüm Yok)'}
                              </button>
                            </div>
                          );
                        })()}


                  {/* NO2 Slider — Gerçek veri uygulandıysa kaynak rozeti gösterilir */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">NO₂ Göstergesi (µg/m³)</span>
                      <span className="font-bold text-slate-900">{indicators.no2Level} µg/m³</span>
                    </div>
                    {/* Gerçek Konya ölçümü uygulandıysa kaynak rozeti */}
                    {realDataSources.no2Level && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full px-2.5 py-0.5 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        📍 Uygulanan Gerçek Ölçüm: {realDataSources.no2Level.station} · {realDataSources.no2Level.date} ({realDataSources.no2Level.value} {realDataSources.no2Level.unit})
                      </div>
                    )}
                    <input
                      type="range"
                      min={Math.min(15, Math.floor(indicators.no2Level))}
                      max={Math.max(90, Math.ceil(indicators.no2Level))}
                      step={realDataSources.no2Level ? 'any' : '1'}
                      value={indicators.no2Level}
                      onChange={(e) => handleIndicatorChange('no2Level', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    {!realDataSources.no2Level && (
                      <div className="text-[10px] text-slate-500 mt-0.5">Kullanıcı / Örnek Girdisi · Gerçek istasyon ölçümü uygulanmadı</div>
                    )}
                  </div>

                  {/* Yapılaşma Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Yapılaşma Yoğunluğu (%)</span>
                      <span className="font-bold text-slate-900">%{indicators.builtUpDensity}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      step="1"
                      value={indicators.builtUpDensity}
                      onChange={(e) => handleIndicatorChange('builtUpDensity', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Yeşil Alan Slider */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Mevcut Yeşil Alan Oranı (%)</span>
                      <span className="font-bold text-emerald-800">%{indicators.greenSpaceRatio}</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="45"
                      step="1"
                      value={indicators.greenSpaceRatio}
                      onChange={(e) => handleIndicatorChange('greenSpaceRatio', parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. YEŞİL ALAN MÜDAHALE SENARYOLARI KARŞILAŞTIRMA */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    3. Yeşil Alan Müdahale Senaryoları (Karşılaştırma)
                  </h2>
                </div>
                <span className="text-xs text-slate-600">
                  İncelemek için bir senaryo seçin
                </span>
              </div>

              {/* 3 Senaryo Seçim Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {SCENARIOS.map((scenario) => {
                  const isSelected = selectedScenarioId === scenario.id;
                  const impact = calculateProjectedImpact(indicators, scenario);

                  return (
                    <button
                      key={scenario.id}
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                            {scenario.costLabel}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2">
                          {scenario.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                          {scenario.description}
                        </p>
                      </div>

                      {/* Varsayımsal Etki Projeksiyonu */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Sıcaklık Değişimi:</span>
                          <span className="font-bold text-emerald-700 flex items-center">
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            -{impact.tempDelta}°C
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">NO₂ Azalma Oranı:</span>
                          <span className="font-bold text-teal-700">-%{impact.no2DeltaPct}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">Yeşil Alan Artışı:</span>
                          <span className="font-bold text-emerald-800 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-0.5" />
                            +%{impact.greenDelta}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-600 text-right italic pt-0.5">
                          *Varsayımsal demo projeksiyonu
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Seçili Senaryonun Detaylı İncelemesi */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-semibold text-emerald-700 uppercase">
                      İncelenen Senaryo Detayı (AI Modeline İletilen Seçim)
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentScenario.title}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600">
                    Tahmini Takvim: <strong className="text-slate-800">{currentScenario.implementationTime}</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-700 mb-3">
                  <strong>Uygulama Kapsamı:</strong> {currentScenario.scope}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-emerald-100">
                    <div className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Avantajlar ve Güçlü Yönler:
                    </div>
                    <ul className="space-y-1 text-slate-700">
                      {currentScenario.advantages.map((adv, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-100">
                    <div className="font-bold text-amber-900 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Olası Sınırlamalar ve Zorluklar:
                    </div>
                    <ul className="space-y-1 text-slate-700">
                      {currentScenario.limitations.map((lim, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{lim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Dinamik Karşılaştırma Sonucu */}
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>Tahmini Sonuç (Demo Projeksiyonu):</strong>{' '}
                    Sıcaklık <strong>{indicators.temperature}°C → {projectedImpact.projectedTemp}°C</strong>,{' '}
                    NO₂ <strong>{indicators.no2Level} → {projectedImpact.projectedNo2} µg/m³</strong>,{' '}
                    Yeşil Alan <strong>%{indicators.greenSpaceRatio} → %{projectedImpact.projectedGreen}</strong>
                  </div>
                  <span className="text-[10px] text-emerald-800 bg-white/80 px-2 py-0.5 rounded font-medium border border-emerald-300">
                    Varsayımsal Demo Değerleri
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* SAĞ ALAN: YAPAY ZEKÂ ANALİZ VE KARAR DESTEK PANELİ (5 Kolon) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 4. AI ANALİZİ VE ÖNERİSİ PANELİ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      4. AI Analizi ve Karar Önerisi
                    </h2>
                    <span className="text-[11px] text-slate-600">
                      Güncel göstergeleri ve seçili senaryoyu birlikte yorumlar
                    </span>
                  </div>
                </div>
              </div>

              {/* Güncelleme Gerekli Uyarısı (Inputs changed since last run) */}
              {isAnalysisOutdated && (
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-medium">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    Göstergeler veya seçili senaryo güncellendi!
                  </span>
                  <span className="text-[10px] underline cursor-pointer font-bold" onClick={runAIAnalysis}>
                    Yeniden Analiz Et
                  </span>
                </div>
              )}

              {/* Analiz Başlatma Düğmesi */}
              <button
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Kentsel Veriler Yapay Zekâ ile Yorumlanıyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Bölge Verileri & Seçili Senaryo İçin AI Analizini Çalıştır
                  </>
                )}
              </button>

              {/* Motor Durum Bildirimi (Açık ve Dürüst Etiketleme) */}
              {aiAnalysis && (
                <div className="mt-3">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-between border ${
                      aiAnalysis.engineUsed === 'gemini'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          aiAnalysis.engineUsed === 'gemini' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      ></span>
                      {aiAnalysis.engineUsed === 'rule_based_fallback' &&
                      hasServerApiKey &&
                      !fallbackNotice
                        ? 'Kural Tabanlı Ön Analiz (Gemini API Anahtarı Aktif — Canlı Analiz Hazır)'
                        : aiAnalysis.engineLabel}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {aiAnalysis.generatedAt}
                    </span>
                  </div>
                  {aiAnalysis.engineUsed === 'rule_based_fallback' && (
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-2 mt-1.5 text-[10px] text-amber-800 space-y-1">
                      <p>
                        <strong>Bilgilendirme:</strong>{' '}
                        {fallbackNotice ||
                          (hasServerApiKey
                            ? 'Sunucuda GEMINI_API_KEY tanımlıdır. Canlı Gemini analizi tamamlandığında veya yukarıdaki analiz butonuna tıkladığınızda yapay zekâ raporu güncellenir.'
                            : 'GEMINI_API_KEY ortam değişkeni tanımlı olmadığında bu kural tabanlı yedek motor çalıştırılır. Sistem sahte yapay zekâ çıktısı üretmez, kurallara bağlı deterministik analiz sunar.')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* AI ÇIKTISI: ZORUNLU BAŞLIKLAR */}
              {aiAnalysis ? (
                <div className="mt-4 space-y-3.5 text-xs">
                  {/* Veri Niteliği ve Metodolojik Sınır Özeti (Gerçek Ölçüm vs. Kullanıcı Girdisi vs. Varsayımsal Model Çıktısı) */}
                  <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-[10.5px] text-slate-700 space-y-1">
                    <div className="font-bold text-slate-900">
                      Veri Kaynağı ve Model Çıktısı Ayrımı
                    </div>
                    <div>
                      <span className="font-semibold text-emerald-800">• Gerçek İstasyon Verisi:</span>{' '}
                      {realDataSources.no2Level
                        ? `Konya ${realDataSources.no2Level.station} İstasyonu (${realDataSources.no2Level.date}) · ${realDataSources.no2Level.value} ${realDataSources.no2Level.unit} NO₂ — yalnızca bu ölçüm noktasını temsil eder; tüm mahallelerin hava kalitesi için kesin sonuç olarak genellenemez.`
                        : 'Aktif gerçek istasyon ölçümü uygulanmadı (NO₂ değeri kullanıcı girdisidir).'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">• Kullanıcı Girdisi / Demo Varsayımı:</span>{' '}
                      Sıcaklık ({indicators.temperature}°C), Trafik Yoğunluğu (%{indicators.trafficDensity}), Yapılaşma Oranı (%{indicators.builtUpDensity}) ve Yeşil Alan Oranı (%{indicators.greenSpaceRatio}) gerçek veri kaynağından gelmeyen kullanıcı/senaryo girdileridir.
                    </div>
                    <div>
                      <span className="font-semibold text-amber-900">• Varsayımsal Model Çıktısı ve Hipotezler:</span>{' '}
                      Stres skoru ({stress.stressScore}/100) ve senaryo azaltım katsayıları (-{currentScenario.tempReductionDemo}°C ısı, -%{currentScenario.no2ReductionDemo} NO₂, +%{currentScenario.greenIncreaseDemo} yeşil alan) varsayımsal model çıktılarıdır; rüzgâr ve bina geometrisi verileri olmadan kentsel kanyon etkisi ve kirletici dağılımı iyileşmesi ileri analiz gerektiren hipotezlerdir.
                    </div>
                  </div>

                  {/* 1. Bölgenin Mevcut Durumu */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-slate-600" />
                      1. Bölgenin Mevcut Durumu
                    </h4>
                    <p className="text-slate-700 leading-relaxed text-[11px]">
                      {aiAnalysis.currentStatus}
                    </p>
                  </div>

                  {/* 2. Öncelikli Çevresel Sorun */}
                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                    <h4 className="font-bold text-rose-950 mb-1 flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      2. Öncelikli Çevresel Sorun
                    </h4>
                    <p className="text-rose-900 font-medium text-[11px]">
                      {aiAnalysis.priorityIssue}
                    </p>
                  </div>

                  {/* 3. İncelediğiniz Senaryonun Değerlendirmesi */}
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                        <Compass className="w-3.5 h-3.5 text-blue-600" />
                        3. İncelediğiniz Senaryonun Değerlendirmesi
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded font-semibold">
                        Girdi Senaryosu
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-blue-900 mb-1">
                      {aiAnalysis.evaluatedScenarioTitle || currentScenario.title}
                    </div>
                    <p className="text-blue-950 text-[11px] leading-relaxed">
                      {aiAnalysis.evaluatedScenarioAssessment ||
                        'Kullanıcının seçtiği senaryo göstergeler doğrultusunda analiz edilmiştir.'}
                    </p>
                  </div>

                  {/* 4. Modelin Önerdiği Öncelikli Senaryo */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-500/80 shadow-xs">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                        <TreePine className="w-4 h-4 text-emerald-700" />
                        4. Modelin Önerdiği Müdahale
                      </h4>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                        Öncelikli Tavsiye
                      </span>
                    </div>
                    <div className="text-sm font-extrabold text-emerald-900 mt-1">
                      {aiAnalysis.recommendedScenarioTitle}
                    </div>
                    {aiAnalysis.recommendedScenarioId !== selectedScenarioId && (
                      <button
                        onClick={() => setSelectedScenarioId(aiAnalysis.recommendedScenarioId)}
                        className="mt-2 text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1 underline cursor-pointer"
                      >
                        Önerilen bu senaryoyu inceleme paneline getir <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* 5. Alternatif Senaryolarla Karşılaştırma */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs">
                      <Scale className="w-3.5 h-3.5 text-slate-600" />
                      5. Alternatif Senaryolarla Karşılaştırma
                    </h4>
                    <div className="text-slate-700 text-[11px] whitespace-pre-line leading-relaxed">
                      {aiAnalysis.alternativeComparison}
                    </div>
                  </div>

                  {/* 6. Önerinin Gerekçesi */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      6. Önerinin Gerekçesi
                    </h4>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {aiAnalysis.justification}
                    </p>
                  </div>

                  {/* 7. Belirsizlikler ve İhtiyaç Duyulan Ek Veriler */}
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                    <h4 className="font-bold text-amber-950 mb-1.5 flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      7. Belirsizlikler ve İhtiyaç Duyulan Ek Veriler
                    </h4>
                    <ul className="space-y-1 text-amber-900 text-[11px]">
                      {aiAnalysis.uncertaintiesAndDataGaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Karar Raporunu Kopyalama Düğmesi */}
                  <button
                    onClick={handleCopySummary}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedNotification ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Karar Raporu Panoya Kopyalandı!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        AI Karar Destek Raporunu Kopyala
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {/* Karar Verici Hatırlatması */}
              <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-600 leading-tight">
                <strong>Karar Verici Notu:</strong> Yapay zekânın görevi bağlayıcı şehir planlama kararı vermek değil;
                çevresel verileri sentezleyerek karar vericilere veri odaklı, karşılaştırmalı alternatifler sunmaktır.
              </div>
            </div>

          </div>

        </div>

        {/* CLIMATHON PROJE BİLGİ VE SONRAKİ ADIMLAR BÖLÜMÜ */}
        <div className="mt-10 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="max-w-3xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Climathon Konsepti: Gelecek Geliştirme Yol Haritası
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Bu prototip, kentsel yeşil alan planlamasında yapay zekânın karar destek rolünü doğrulamaktadır.
              Gelecek aşamalarda projeye eklenecek temel bileşenler:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">1. IoT Sensör & Uydu Verisi</div>
                <p className="text-slate-600 text-[11px]">
                  Avrupa Çevre Ajansı (EEA) istasyonları ve Sentinel-2 NDVI yüzey sıcaklık uydu katmanlarının canlı entegrasyonu.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">2. 3B Mikroklima CFD Simülasyonu</div>
                <p className="text-slate-600 text-[11px]">
                  Bina kanyon geometrileri ve hâkim rüzgar koridorları ile 3 boyutlu akışkanlar dinamiği hesaplaması.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900 mb-1">3. Belediye CBS & Parsel Entegrasyonu</div>
                <p className="text-slate-600 text-[11px]">
                  Kamulaştırma maliyetleri ve kadastro parsel verisiyle otomatik bütçe-fayda optimizasyonu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
