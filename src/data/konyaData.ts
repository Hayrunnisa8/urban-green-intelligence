
export interface AirQualityRecord {
  station: string;
  date: string;
  CO: number | null;
  NO: number | null;
  NO2: number | null;
  NOX: number | null;
  O3: number | null;
  PM10: number | null;
  SO2: number | null;
  [key: string]: string | number | null;
}

export interface DistrictStatistic {
  ilce: string;
  mahalle: string;
  nufus?: number | null;
  konut?: number | null;
  isyeri_sayisi?: number | null;
  [key: string]: string | number | null | undefined;
}

interface KonyaDataFile {
  metadata: {
    description: string;
    air_quality_daily_records: number;
    neighborhood_records: number;
    [key: string]: unknown;
  };
  air_quality_daily: AirQualityRecord[];
  neighborhood_statistics: DistrictStatistic[];
}

export async function loadKonyaData(): Promise<KonyaDataFile> {
  const response = await fetch(
    '/assets/aistudio/konya-climathon-data-compact_51c78bbc.json'
  );

  if (!response.ok) {
    throw new Error(`Veri dosyası yüklenemedi: ${response.status}`);
  }

  return (await response.json()) as KonyaDataFile;
}
