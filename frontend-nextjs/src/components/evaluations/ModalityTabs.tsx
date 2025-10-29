'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextResults } from './TextResults'
import { ImageResults } from './ImageResults'

export function ModalityTabs({ detail }: { detail: any }) {
  const modality = String(detail?.modality || '').toLowerCase()
  const hasText = modality === 'text' || modality === 'multimodal' || modality === 'multi-modal'
  const hasImage = modality === 'image' || modality === 'multimodal' || modality === 'multi-modal'

  return (
    <Tabs defaultValue={hasText ? 'text' : hasImage ? 'image' : 'audio'} className="w-full">
      <TabsList>
        <TabsTrigger value="text">Text</TabsTrigger>
        <TabsTrigger value="image">Image</TabsTrigger>
        <TabsTrigger value="audio">Audio</TabsTrigger>
        <TabsTrigger value="video">Video</TabsTrigger>
      </TabsList>

      <TabsContent value="text">
        {hasText ? <TextResults detail={detail} /> : <div className="text-muted-foreground">No text results</div>}
      </TabsContent>
      <TabsContent value="image">
        {hasImage ? <ImageResults detail={detail} /> : <div className="text-muted-foreground">No image results</div>}
      </TabsContent>
      <TabsContent value="audio">
        <div className="text-muted-foreground">[coming soon]</div>
      </TabsContent>
      <TabsContent value="video">
        <div className="text-muted-foreground">[coming soon]</div>
      </TabsContent>
    </Tabs>
  )
}


