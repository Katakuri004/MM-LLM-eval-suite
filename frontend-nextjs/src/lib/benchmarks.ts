// Map benchmark ids to modality buckets used by the UI
// Keep lightweight; extend as needed

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'unknown'

const prefixToModality: Array<{ test: (id: string) => boolean; modality: Modality }> = [
  // Text benchmarks
  { test: id => /^mmlu(_redux)?/.test(id), modality: 'text' },
  { test: id => /^(hellaswag|arc_(easy|challenge)|openbookqa|gpqa|aime25|aime25_nofigures|zebralogic|polymath)/.test(id), modality: 'text' },
  { test: id => /^(ifeval|commoneval|bbh|public_relations|logical_fallacies)/.test(id), modality: 'text' },

  // Image / vision benchmarks
  { test: id => /^(ok_vqa|okvqa|ok-vqa|lvbench|mmmu|mmau)/.test(id), modality: 'image' },

  // Audio / speech benchmarks
  { test: id => /^(librispeech|open_asr|common_voice|fleurs|voxpopuli|gigaspeech|ami|earnings22|spgispeech|tedlium)/.test(id), modality: 'audio' },
  { test: id => /^voicebench/.test(id), modality: 'audio' },

  // Video benchmarks (if present)
  { test: id => /^video/.test(id), modality: 'video' },
]

export function getBenchmarkModality(benchmarkId: string): Modality {
  const id = (benchmarkId || '').toLowerCase()
  for (const m of prefixToModality) {
    if (m.test(id)) return m.modality
  }
  return 'unknown'
}


