'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ClusterAccessPage() {
  const [preset, setPreset] = React.useState<'light' | 'medium' | 'heavy'>('light')
  const [nodelist, setNodelist] = React.useState('')
  const [hours, setHours] = React.useState(2)

  const makeCommand = () => {
    const cores = preset === 'light' ? 4 : preset === 'medium' ? 8 : 16
    const gpus = preset === 'light' ? 1 : preset === 'medium' ? 1 : 2
    const t = `${hours}:00:00`
    const nodePart = nodelist.trim() ? ` --nodelist=${nodelist.trim()}` : ''
    return `srun -c ${cores} --gres=gpu:${gpus} -t ${t}${nodePart} --pty bash`
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const sbatchScript = `#!/bin/bash\n#SBATC H -c 8\n#SBATC H --gres=gpu:1\n#SBATC H -t 4:00:00\n#SBATC H -J lmms_eval_job\n#SBATC H -o output_%j.log\n\nsource ~/.bashrc\nconda activate lmms-eval\npython -m lmms_eval --model qwen2_vl --tasks ok_vqa_val2014 --limit 100\n`.replace(/SBATC H/g,'SBATCH')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Cluster Access</h1>

      <Card>
        <CardHeader>
          <CardTitle>Preflight Checks (run manually after VPN/SSH)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid md:grid-cols-2 gap-3">
            <Textarea rows={3} readOnly value={`sinfo\nsqueue -u $USER\nconda --version\nnvidia-smi`} />
            <div className="text-muted-foreground">Copy these to verify cluster, queue, conda and GPU visibility.</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => copy(`sinfo\nsqueue -u $USER\nconda --version\nnvidia-smi`)}>Copy</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interactive GPU (srun template)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Preset</label>
            <select className="border rounded px-2 py-1 text-sm" value={preset} onChange={e => setPreset(e.target.value as any)}>
              <option value="light">Light (4c, 1 GPU)</option>
              <option value="medium">Medium (8c, 1 GPU)</option>
              <option value="heavy">Heavy (16c, 2 GPU)</option>
            </select>
            <label className="text-sm">Hours</label>
            <Input className="w-24" type="number" min={1} max={12} value={hours} onChange={e => setHours(parseInt(e.target.value) || 1)} />
            <label className="text-sm">Node</label>
            <Input className="w-48" value={nodelist} onChange={e => setNodelist(e.target.value)} />
          </div>
          <Textarea rows={2} readOnly value={makeCommand()} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(makeCommand())}>Copy</Button>
            <span className="text-xs text-muted-foreground">Run inside tmux to persist across VPN disconnects.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Job (sbatch template)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Textarea rows={10} readOnly value={sbatchScript} />
          <Button variant="outline" size="sm" onClick={() => copy(sbatchScript)}>Copy</Button>
        </CardContent>
      </Card>
    </div>
  )
}


