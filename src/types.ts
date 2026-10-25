/**
 * Urban Green Intelligence - Tip Tanımları
 * Climathon Kentsel Yeşil Alan Karar Destek Prototipi
 */

export interface UrbanIndicators {
  temperature: number; // °C (Ortalama yüzey/hava sıcaklığı)
  trafficDensity: number; // 0 - 100 (%)
  trafficLevel: 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik';
  no2Level: number; // µg/m³ (Azot dioksit göstergesi)
  builtUpDensity: number; // % (Yapılaşma ve geçirimsiz yüzey oranı)
  greenSpaceRatio: number; // % (Mevcut kentsel yeşil alan oranı)
}

export interface DistrictPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: UrbanIndicators;
  tag: string;
}

export type ScenarioId = 'protect_and_enhance' | 'new_pocket_parks' | 'green_corridors';

export interface Scenario {
  id: ScenarioId;
  title: string;
  subtitle: string;
  description: string;
  scope: string;
  costLevel: 1 | 2 | 3; // 1: Düşük, 2: Orta, 3: Yüksek
  costLabel: string;
  implementationTime: string;
  
  // Varsayımsal demo etki değerleri
  tempReductionDemo: number; // °C düşüş (varsayımsal)
  no2ReductionDemo: number; // % azalma (varsayımsal)
  greenIncreaseDemo: number; // % yeşil alan artışı (varsayımsal)
  accessibilityDemo: string; // erişim yönü
  
  advantages: string[];
  limitations: string[];
  recommendedWhen: string;
}

export interface AIAnalysisResult {
  currentStatus: string;
  priorityIssue: string;
  evaluatedScenarioTitle?: string;
  evaluatedScenarioAssessment?: string;
  recommendedScenarioId: ScenarioId;
  recommendedScenarioTitle: string;
  alternativeComparison: string;
  justification: string;
  uncertaintiesAndDataGaps: string[];
  confidenceScore: number;
  engineUsed: 'gemini' | 'rule_based_fallback';
  engineLabel: string;
  generatedAt: string;
  inputSnapshot?: {
    temperature: number;
    trafficDensity: number;
    no2Level: number;
    builtUpDensity: number;
    greenSpaceRatio: number;
    scenarioId: ScenarioId;
  };
}
