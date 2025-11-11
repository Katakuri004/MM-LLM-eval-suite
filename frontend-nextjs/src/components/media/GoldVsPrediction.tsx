'use client'

import React from 'react'

type Props = {
	gold?: Record<string, any>
	prediction?: Record<string, any>
	normalized?: Record<string, any>
	taskHints?: { type?: 'mcq' | 'asr' | 'caption' }
}

export function GoldVsPrediction({ gold, prediction, normalized, taskHints }: Props) {
	const norm = normalized || prediction
	// Simple MCQ render heuristic
	const choices: string[] | undefined =
		(Array.isArray((gold as any)?.choices) && (gold as any).choices) ||
		(Array.isArray((prediction as any)?.choices) && (prediction as any).choices) ||
		undefined
	const goldIdx = (gold as any)?.choice_idx_gold ?? (gold as any)?.label_idx
	const predIdx = (norm as any)?.choice_idx_pred ?? (norm as any)?.pred_idx

	if (choices && typeof goldIdx === 'number') {
		return (
			<div className="space-y-2">
				<div className="text-sm text-muted-foreground">Multiple Choice</div>
				<ol className="list-decimal ml-5 space-y-1">
					{choices.map((c, i) => {
						const isGold = i === goldIdx
						const isPred = typeof predIdx === 'number' && i === predIdx
						return (
							<li
								key={i}
								className={`rounded px-2 py-1 ${
									isGold ? 'bg-green-50 dark:bg-green-950/20' : ''
								} ${isPred && !isGold ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
							>
								<span className="font-mono mr-2">[{i}]</span>
								{c}
								{isGold && <span className="ml-2 text-xs text-green-700">gold</span>}
								{isPred && <span className="ml-2 text-xs text-red-700">pred</span>}
							</li>
						)
					})}
				</ol>
			</div>
		)
	}

	// Default JSON compare
	return (
		<div className="space-y-4">
			<div>
				<div className="text-sm text-muted-foreground mb-1">Gold</div>
				<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
					{JSON.stringify(gold ?? {}, null, 2)}
				</pre>
			</div>
			<div>
				<div className="text-sm text-muted-foreground mb-1">Prediction</div>
				<pre className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap break-words">
					{JSON.stringify(norm ?? prediction ?? {}, null, 2)}
				</pre>
			</div>
		</div>
	)
}


