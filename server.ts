import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Öncelik sırası: mevcut ortam değişkenleri > .env.local > .env
dotenv.config({ path: ['.env.local', '.env'] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Health & Status
  app.get('/api/status', (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    res.json({
      status: 'ok',
      hasGeminiApiKey: hasKey,
      appName: 'Urban Green Intelligence',
    });
  });

  // AI Decision Analysis Endpoint
  app.post('/api/ai-analyze', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const { indicators, selectedScenarioId, selectedScenarioTitle, realDataContext } = req.body;

    if (!indicators) {
      return res.status(400).json({ error: 'Kentsel gösterge verileri eksik.' });
    }

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        geminiActive: false,
        reason: 'missing_key',
        message: 'GEMINI_API_KEY tanımlanmamış. Kural tabanlı yedek karar motoru devrede.',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
          retryOptions: {
            attempts: 1,
          },
        },
      });

      const userScenarioText = selectedScenarioTitle || selectedScenarioId || 'Seçili Senaryo';

      // Gerçek Konya ölçümü gönderildiyse doğrula ve prompt'a eklenecek bağlam bloğunu oluştur
      const realDataSection = (() => {
        if (!realDataContext || typeof realDataContext !== 'object') {
          return ''; // Gerçek veri bağlamı gelmedi — mevcut davranış geriye dönük uyumlu biçimde korunur
        }
        const hasReal =
          realDataContext.hasRealMeasurement !== false &&
          realDataContext.measurementAvailable !== false;
        const measuredVal =
          typeof realDataContext.appliedNo2Value === 'number'
            ? realDataContext.appliedNo2Value
            : typeof realDataContext.value === 'number'
            ? realDataContext.value
            : null;
        const stationName =
          typeof realDataContext.station === 'string' && realDataContext.station.trim()
            ? realDataContext.station.trim()
            : null;
        const measurementDate =
          typeof realDataContext.measurementDate === 'string' && realDataContext.measurementDate.trim()
            ? realDataContext.measurementDate.trim()
            : typeof realDataContext.date === 'string' && realDataContext.date.trim()
            ? realDataContext.date.trim()
            : null;
        const unit =
          typeof realDataContext.unit === 'string' && realDataContext.unit.trim()
            ? realDataContext.unit.trim()
            : 'µg/m³';

        if (!hasReal || measuredVal === null || !Number.isFinite(measuredVal) || measuredVal <= 0 || !stationName || !measurementDate) {
          return '';
        }

        const sourceDesc =
          typeof realDataContext.no2Source === 'string' && realDataContext.no2Source.trim()
            ? realDataContext.no2Source.trim()
            : `Konya ${stationName} İstasyonu ${measurementDate} tarihli günlük ortalama NO₂ ölçümü: ${measuredVal.toFixed(3)} ${unit}`;

        return `

GERÇEK ÖLÇÜM BAĞLAMI (Karar destek sistemine kullanıcı onayıyla aktarılmış istasyon verisi):
- Ölçüm Mevcut mu: Evet (Doğrulanmış gerçek istasyon kaydı)
- İstasyon Adı: ${stationName}
- Ölçüm Tarihi: ${measurementDate}
- Gerçek NO₂ Ölçüm Değeri: ${measuredVal.toFixed(3)} ${unit}
- Özet: ${sourceDesc}
- Veri Notu: ${realDataContext.dataNote || 'Sıcaklık, trafik yoğunluğu, yapılaşma yoğunluğu ve yeşil alan oranı kullanıcı tarafından girilmiş varsayımsal değerlerdir.'}

VERİ KAYNAKLARI KURALLARI (Bu kurallara uymak zorundasın):
- Gerçek ölçümü (${measuredVal.toFixed(3)} ${unit}, ${stationName} istasyonu, ${measurementDate}) kullanıcı tarafından girilmiş varsayımsal bir değerle karıştırma.
- Ölçümü yalnızca belirtilen istasyon (${stationName}) ve tarih (${measurementDate}) bağlamında yorumla.
- Tek bir istasyon ölçümünü bütün Konya'nın veya seçilen herhangi bir mahallenin doğrudan ölçümü olarak sunma.
- Kaynak veride bulunmayan sıcaklık, trafik yoğunluğu, yapılaşma yoğunluğu ve yeşil alan oranını gerçek ölçüm gibi gösterme; bunların kullanıcı/senaryo girdisi olduğunu koru.
- Veri yetersizse bunu açıkça belirt ve kesin nedensellik iddiasında bulunma.`;
      })();

      const prompt = `Sen sürdürülebilir şehirler uzmanı ve yapay zekâ tabanlı kentsel karar destek sistemleri uzmanısın.
Climathon prototipinde bir kentsel bölge için karar verici tarafından girilen güncel göstergeler ve seçilen müdahale senaryosu aşağıdadır:

KENTSEL GÖSTERGELER:
- Ortalama Sıcaklık: ${indicators.temperature}°C (Kullanıcı girdisi / demo varsayımı - Kentsel ısı adası göstergesi)
- Trafik Yoğunluğu: %${indicators.trafficDensity} (${indicators.trafficLevel} - Kullanıcı girdisi / demo varsayımı)
- NO₂ Göstergesi: ${indicators.no2Level} µg/m³ (${realDataSection ? 'Gerçek istasyon ölçümü uygulandı' : 'Kullanıcı girdisi / demo varsayımı'})
- Yapılaşma Yoğunluğu: %${indicators.builtUpDensity} (Kullanıcı girdisi / demo varsayımı - Geçirimsiz yüzey ve betonlaşma oranı)
- Mevcut Yeşil Alan Oranı: %${indicators.greenSpaceRatio} (Kullanıcı girdisi / demo varsayımı - Açık ve yeşil alan yüzdesi)${realDataSection}

KULLANICININ İNCELEDİĞİ SEÇİLİ SENARYO:
"${userScenarioText}" (ID: ${selectedScenarioId || 'bilinmiyor'})

MEVCUT 3 MÜDAHALE SEÇENEĞİ (Varsayımsal Demo Simülasyon Katsayıları ile):
1. protect_and_enhance: Mevcut yeşil alanların korunması ve iyileştirilmesi (Düşük maliyet - ₺ | Varsayımsal katsayılar: -0.7°C ısı, -%8 NO₂, +%4 yeşil alan)
2. new_pocket_parks: Yeni ağaçlandırma ve kentsel cep parkları (Orta maliyet - ₺₺ | Varsayımsal katsayılar: -1.8°C ısı, -%18 NO₂, +%12 yeşil alan)
3. green_corridors: Yeşil koridorlar ve doğa temelli müdahalelerin birleştirilmesi (Yüksek maliyet - ₺₺₺ | Varsayımsal katsayılar: -2.9°C ısı, -%32 NO₂, +%22 yeşil alan)

BİLİMSEL GÜVENİLİRLİK VE İÇERİK DOĞRULUĞU KURALLARI (Tüm alanlarda zorunludur):
- Gerçek verilerle kullanıcı tarafından girilen varsayımsal göstergeleri açıkça ayır. Gerçek NO₂ istasyon verisi varsa (ör. Bosna istasyonunun 2025-01-15 tarihli 27.755 µg/m³ NO₂ ölçümü) bunu gerçek istasyon verisi olarak belirt; sıcaklık, trafik yoğunluğu, yapılaşma oranı ve yeşil alan oranını ise gerçek veri kaynağından gelmediği için "kullanıcı girdisi" veya "demo varsayımı" olarak tanımla.
- Tek bir istasyondaki NO₂ ölçümünden bütün mahallelerin hava kalitesi hakkında kesin sonuç çıkarma; ölçümün mekânsal temsil sınırını açıkça belirt.
- Rüzgâr verileri ve bina geometrisi bulunmadan kentsel kanyon etkisini, kirleticilerin hapsolmasını veya yeşil koridorların NO₂ dağılımını iyileştireceğini doğrulanmış gerçekler gibi sunma; bunları olası mekanizmalar ve ileri analiz (CFD/mikroklima modellemesi) gerektiren hipotezler olarak ifade et.
- Senaryo karşılaştırmalarında kullanılan katsayıların varsayımsal olduğunu ve önerinin bu varsayımsal katsayılara dayandığını açıkça yaz; hesaplama ile doğrulanmamış bir çevresel etkiyi kesin sonuç olarak sunma.

Lütfen karar vericiye rehberlik edecek profesyonel, veri temelli ve bilimsel açıdan dürüst bir Türkçe karar analizi üret:
1. currentStatus: Bölgenin mevcut durum sentezi (hangi göstergelerin gerçek istasyon ölçümü, hangilerinin kullanıcı girdisi/demo varsayımı ve hangilerinin varsayımsal model çıktısı olduğunu ve tek istasyon ölçümünün mekânsal temsil sınırını açıkça belirterek).
2. priorityIssue: Bölgede müdahale gerektiren öncelikli çevresel sorun (ısı adası baskısı, NO₂ kirliliği veya aşırı yapılaşmaya bağlı yeşil açığı).
3. evaluatedScenarioAssessment: Karar vericinin incelediği "${userScenarioText}" senaryosunun bu göstergeler ve varsayımsal model katsayıları karşısındaki avantajları, sınırlamaları ve uygunluk değerlendirmesi (etkilerin kesin ölçüm değil varsayımsal simülasyon çıktısı olduğunu belirterek).
4. recommendedScenarioId: protect_and_enhance | new_pocket_parks | green_corridors seçeneklerinden en uygunu.
5. recommendedScenarioTitle: Önerilen senaryonun Türkçe tam başlığı.
6. alternativeComparison: Önerilen senaryonun diğer alternatiflerle varsayımsal katsayılar, maliyet ve etki açısından karşılaştırması (kentsel kanyon ve kirletici dağılım mekanizmalarını kesin gerçek değil, rüzgâr ve bina geometrisi verisi gerektiren olası mekanizmalar/hipotezler olarak ifade ederek).
7. justification: Bu önerinin hangi gerçek/varsayımsal göstergelere, varsayımsal senaryo katsayılarına ve bütçe-etki dengesine dayandığı.
8. uncertaintiesAndDataGaps: Tek istasyon ölçümünün tüm mahallelere genellenemeyeceği (mekânsal temsil sınırı), sıcaklık/trafik/yapılaşma/yeşil alanın kullanıcı girdisi olduğu, rüzgâr yönü/hızı ve 3B bina kanyon geometrisi olmadan kanyon/dağılım etkilerinin hipotez niteliği taşıdığı ve yerel altyapı/hidroloji verisi eksiklikleri.
9. confidenceScore: 0 ile 100 arasında bir güven skoru.`;

      const classifyGeminiError = (err: any) => {
        const rawStatus =
          typeof err?.status === 'number'
            ? err.status
            : typeof err?.statusCode === 'number'
            ? err.statusCode
            : typeof err?.error?.code === 'number'
            ? err.error.code
            : null;
        let statusCode: number | null = rawStatus;
        if (statusCode === null && typeof err?.message === 'string') {
          if (err.message.includes('"code":503') || err.message.includes('503') || err.message.includes('UNAVAILABLE')) {
            statusCode = 503;
          } else if (err.message.includes('"code":429') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
            statusCode = 429;
          } else if (err.message.includes('"code":401') || err.message.includes('"code":403')) {
            statusCode = 403;
          } else if (err.message.includes('"code":404')) {
            statusCode = 404;
          }
        }
        const errorCategory =
          statusCode === 503
            ? 'service_unavailable'
            : statusCode === 429
            ? 'rate_limit'
            : statusCode === 401 || statusCode === 403
            ? 'unauthorized'
            : statusCode === 404
            ? 'model_not_found'
            : 'general_api_error';
        return { statusCode, errorCategory };
      };

      const generationConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentStatus: { type: Type.STRING },
            priorityIssue: { type: Type.STRING },
            evaluatedScenarioAssessment: { type: Type.STRING },
            recommendedScenarioId: { type: Type.STRING },
            recommendedScenarioTitle: { type: Type.STRING },
            alternativeComparison: { type: Type.STRING },
            justification: { type: Type.STRING },
            uncertaintiesAndDataGaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            confidenceScore: { type: Type.NUMBER },
          },
          required: [
            'currentStatus',
            'priorityIssue',
            'evaluatedScenarioAssessment',
            'recommendedScenarioId',
            'recommendedScenarioTitle',
            'alternativeComparison',
            'justification',
            'uncertaintiesAndDataGaps',
          ],
        },
      };

      const primaryModel = 'gemini-3.8-flash';
      const fallbackModel = 'gemini-3-flash-preview';
      let modelUsed = primaryModel;
      let response;

      try {
        response = await ai.models.generateContent({
          model: primaryModel,
          contents: prompt,
          config: generationConfig,
        });
      } catch (primaryErr: any) {
        const { statusCode, errorCategory } = classifyGeminiError(primaryErr);
        if (statusCode === 503 || statusCode === 429) {
          console.warn('Birincil Gemini modeli yoğun/sınırlı, alternatif model deneniyor:', {
            primaryModel,
            fallbackModel,
            statusCode,
            errorCategory,
          });
          modelUsed = fallbackModel;
          try {
            response = await ai.models.generateContent({
              model: fallbackModel,
              contents: prompt,
              config: generationConfig,
            });
          } catch (fallbackErr: any) {
            const fbClass = classifyGeminiError(fallbackErr);
            if (fbClass.statusCode === 404) {
              throw primaryErr;
            }
            throw fallbackErr;
          }
        } else {
          throw primaryErr;
        }
      }

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        geminiActive: true,
        modelUsed,
        data: parsed,
      });
    } catch (err: any) {
      const rawStatus =
        typeof err?.status === 'number'
          ? err.status
          : typeof err?.statusCode === 'number'
          ? err.statusCode
          : typeof err?.error?.code === 'number'
          ? err.error.code
          : null;
      let statusCode: number | null = rawStatus;
      if (statusCode === null && typeof err?.message === 'string') {
        if (err.message.includes('"code":503') || err.message.includes('503') || err.message.includes('UNAVAILABLE')) {
          statusCode = 503;
        } else if (err.message.includes('"code":429') || err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
          statusCode = 429;
        } else if (err.message.includes('"code":401') || err.message.includes('"code":403')) {
          statusCode = 403;
        } else if (err.message.includes('"code":404')) {
          statusCode = 404;
        }
      }
      const errorCategory =
        statusCode === 503
          ? 'service_unavailable'
          : statusCode === 429
          ? 'rate_limit'
          : statusCode === 401 || statusCode === 403
          ? 'unauthorized'
          : statusCode === 404
          ? 'model_not_found'
          : 'general_api_error';

      console.error('Gemini API Çağrısı Başarısız:', { statusCode, errorCategory });
      return res.json({
        geminiActive: false,
        reason: 'api_error',
        statusCode,
        errorCategory,
      });
    }
  });

  // Mount Vite middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Urban Green Intelligence server listening on port ${port}`);
  });
}

startServer();
