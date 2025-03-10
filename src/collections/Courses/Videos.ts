// collections/Videos.js
import type { CollectionConfig } from 'payload'
import { anyone } from '@/access/anyone'
import { authenticated } from '@/access/authenticated'

export const Videos: CollectionConfig = {
  slug: 'videos',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },

    {
      name: 'duration',
      type: 'number',
      label: 'Duration (seconds)',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'processingStatus',
      type: 'select',
      options: [
        { label: 'Not Processed', value: 'not_processed' },
        { label: 'Queued', value: 'queued' },
        { label: 'Processing', value: 'processing' },
        { label: 'Complete', value: 'complete' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'not_processed',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'processingJobId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'hlsUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  upload: {
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
    adminThumbnail: () => null,
  },

  hooks: {
    afterChange: [
      async ({ req, operation, doc }) => {
        if (operation === 'create') {
          console.log('Starting afterChange for doc:', doc)
          try {
            console.log('Fetching with payload:', {
              bucket: process.env.MINIO_BUCKET || '',
              key: doc.filename,
              outputPrefix: `processed/videos/${doc.id}`,
            })
            const response = await fetch(
              'https://video-processor-production.up.railway.app/process-video',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bucket: process.env.MINIO_BUCKET || '',
                  key: doc.filename,
                  outputPrefix: `processed/videos/${doc.id}`,
                }),
              },
            )
            console.log('Fetch response status:', response.status)

            if (!response.ok) {
              const errorText = await response.text()
              console.error('Fetch failed:', errorText)
              console.log('Updating status to failed for ID:', doc.id)
              await req.payload.update({
                collection: 'videos',
                id: doc.id,
                data: { processingStatus: 'failed' },
              })
            } else {
              const result = await response.json()
              console.log('Fetch succeeded, result:', result)
              console.log('Updating status to queued for ID:', doc.id)
              await req.payload.update({
                collection: 'videos',
                id: doc.id,
                data: {
                  processingStatus: 'queued',
                  processingJobId: result.jobId,
                  hlsUrl: `${process.env.MINIO_PUBLIC_ENDPOINT}/${process.env.MINIO_BUCKET}/processed/videos/${doc.id}/master.m3u8`,
                },
              })
              console.log('Update completed')
            }
          } catch (error) {
            console.error('Error in hook:', error)
            console.log('Updating status to failed due to error for ID:', doc.id)
            await req.payload.update({
              collection: 'videos',
              id: doc.id,
              data: { processingStatus: 'failed' },
            })
          }
        }
        return doc
      },
    ],
  },
}
