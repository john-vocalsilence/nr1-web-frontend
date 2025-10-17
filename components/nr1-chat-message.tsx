"use client"
import React from 'react'
import Image from 'next/image'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import type { IChatMessage } from '@/lib/interfaces'

function formatTime(ts: string | Date) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

type Props = { message: IChatMessage }

export default function Nr1ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-1 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="h-7 w-7 shrink-0 border">
          <AvatarFallback className="bg-primary/10">
            {/* <Bot className="h-4 w-4 text-primary" /> */}
            <Image
              src="/assets/VocalSilenceLogo.png"
              alt="VocalSilence"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[80%] rounded-lg px-4 py-3 ${isUser ? 'bg-blue-900/90 text-primary-foreground' : 'bg-blue-900/10 border border-blacktext-foreground'}`}>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>
        <p className={`mt-1 text-xs ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
      {isUser && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="bg-blue-900/70">
            <User className="h-4 w-4 text-secondary-foreground" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}