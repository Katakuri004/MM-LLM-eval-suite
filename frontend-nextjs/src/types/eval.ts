'use client'

export type Modality = 'text' | 'image' | 'audio' | 'video' | 'multimodal'

export interface AssetRefs {
	image_path?: string
	video_path?: string
	audio_path?: string
	text?: string
	hf_url?: string
}

export interface EvaluationSample {
	// Dataset lineage
	dataset_name: string
	subset_or_config?: string
	split?: string
	hf_repo?: string
	hf_revision?: string
	// Identity
	sample_uid?: string
	sample_idx?: number
	sample_key: string
	// Modality classification (best-effort)
	modality?: Modality
	// Assets and inputs
	asset_refs?: AssetRefs
	input_fields?: Record<string, any>
	// Targets and predictions
	gold?: Record<string, any>
	prediction?: Record<string, any>
	normalized_prediction?: Record<string, any>
	// Metrics
	per_sample_metrics?: Record<string, number | string | boolean | null>
	// Generation and model config
	decoding?: Record<string, any>
	model?: {
		name?: string
		revision?: string
		dtype?: string
		device?: string
	}
	// Prompt provenance
	prompt_artifacts?: {
		system_prompt?: string
		template_id?: string
		prompt_hash?: string
	}
	// Eval meta
	eval_meta?: {
		eval_start_ts?: string
		eval_end_ts?: string
		runner_version?: string
	}
	// Association
	benchmark_id?: string
}

export interface SamplesListResponse {
	model_id: string
	benchmark_id?: string
	total: number
	limit: number
	offset: number
	samples: EvaluationSample[]
}

export interface SampleDetailResponse {
	model_id: string
	benchmark_id?: string
	sample: EvaluationSample
}


