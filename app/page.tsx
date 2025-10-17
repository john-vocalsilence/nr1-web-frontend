'use client'
import Image from "next/image"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function HomePage() {
  const router = useRouter()
  const [qid, setQid] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qid.trim()) return
    router.push(`/nr1/${encodeURIComponent(qid.trim())}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <Avatar className="h-32 w-32 rounded-full border-2 border-blue-200 bg-blue-50 shadow">
          <AvatarFallback className="p-0 m-0 bg-transparent rounded-full">
            <Image
              src="/assets/VocalSilenceLogo.png"
              alt="VocalSilence"
              width={256}
              height={256}
              className="h-full w-full object-contain"
            />
          </AvatarFallback>
        </Avatar>

        <form onSubmit={onSubmit} className="w-full border rounded-md p-4 shadow-sm bg-white">
          <h1 className="text-lg font-semibold mb-3 text-center">Abrir Questionário</h1>
          <label className="block text-sm mb-1" htmlFor="qid">Questionnaire ID</label>
          <input
            id="qid"
            className="w-full border rounded px-3 py-2 mb-3"
            value={qid}
            onChange={(e) => setQid(e.target.value)}
            placeholder="ex: 123"
          />
          <button type="submit" className="w-full bg-blue-900 text-white rounded rounded-md px-3 py-2 disabled:opacity-50" disabled={!qid.trim()}>
            Iniciar
          </button>
        </form>
      </div>
    </div>
  )
}
