'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function ClustersPage() {
  const [name, setName] = React.useState('yotta_h100_login')
  const [host, setHost] = React.useState('10.67.35.245')
  const [user, setUser] = React.useState('asrteam')
  const [allowedNodes, setAllowedNodes] = React.useState('iitmadras004')
  const [privateKey, setPrivateKey] = React.useState('')

  const onSave = () => {
    // Placeholder: in production, post to secure backend endpoint
    alert('Cluster saved locally (demo). In production, this is securely stored server-side with encryption.')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Cluster Settings (Admin)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add Cluster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Host</label>
              <Input value={host} onChange={e => setHost(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">User</label>
              <Input value={user} onChange={e => setUser(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Allowed Nodes (optional)</label>
              <Input value={allowedNodes} onChange={e => setAllowedNodes(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Encrypted Private Key (PEM)</label>
            <Textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)} rows={6} placeholder="Paste encrypted private key blob (never displayed again)" />
          </div>
          <div className="text-xs text-muted-foreground">
            Keys are stored server-side with encryption and are never exposed to clients. This demo does not transmit the key.
          </div>
          <div className="flex justify-end">
            <Button onClick={onSave}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


