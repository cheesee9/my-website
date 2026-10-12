'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { projectQuestions } from '@/data/agentKnowledge'
import { prepareChatMessages } from '../lib/chat-messages'

export default function AgentChat({
  configured,
  basePath,
}: {
  configured: boolean
  basePath: string
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${basePath}/api/chat/`,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages: prepareChatMessages(messages) },
        }),
      })
  )
  const [input, setInput] = useState('')
  const { messages, sendMessage, setMessages, status, error, clearError, stop } = useChat({
    transport,
  })
  const conversation = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    if (followLatest.current && conversation.current) {
      conversation.current.scrollTop = conversation.current.scrollHeight
    }
  }, [messages, status])

  function submit(text: string) {
    if (!configured || busy || !text.trim() || text.trim().length > 2000) return
    clearError()
    followLatest.current = true
    void sendMessage({ text: text.trim() })
    setInput('')
  }

  return (
    <section
      aria-label="项目问答"
      className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
    >
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <div>
          <h2 className="font-semibold">聊聊这个项目</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">回答依据已整理的项目资料</p>
        </div>
        <button
          type="button"
          disabled={busy || messages.length === 0}
          onClick={() => {
            setMessages([])
            clearError()
            setInput('')
            inputRef.current?.focus()
          }}
          className="shrink-0 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
        >
          清空会话
        </button>
      </div>
      {!configured && (
        <p
          role="status"
          className="border-b border-gray-200 bg-gray-50 px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-900"
        >
          项目助手暂未开放对话。你可以先阅读上方介绍，或查看项目源码。
        </p>
      )}
      <div
        ref={conversation}
        role="log"
        aria-label="对话记录"
        aria-live="polite"
        aria-busy={busy}
        tabIndex={0}
        onScroll={() => {
          const element = conversation.current
          if (element)
            followLatest.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
        className="h-[min(48vh,28rem)] min-h-64 space-y-5 overflow-y-auto px-5 py-6 sm:px-6"
      >
        {messages.length === 0 ? (
          <div className="max-w-xl">
            <p className="text-lg font-semibold">你好，我是 cheesee9 的项目助手。</p>
            <p className="mt-3 leading-7 text-gray-600 dark:text-gray-400">
              想了解奶牛行为智能检测系统的功能、技术栈或完成情况？可以从下面的问题开始。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {projectQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={!configured}
                  onClick={() => submit(question)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'ml-auto max-w-[90%]' : 'max-w-[95%]'}
            >
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {message.role === 'user' ? '你' : '项目助手'}
              </p>
              <div
                className={
                  message.role === 'user'
                    ? 'rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800'
                    : 'leading-7'
                }
              >
                {message.parts.map((part, index) =>
                  part.type === 'text' ? (
                    <p key={index} className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ) : null
                )}
              </div>
            </div>
          ))
        )}
        {status === 'submitted' && (
          <p role="status" className="text-sm text-gray-500">
            正在阅读你的问题…
          </p>
        )}
      </div>
      <div className="border-t border-gray-200 p-4 sm:p-5 dark:border-gray-800">
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
            本次回复未完成，服务可能暂不可用或请求过于频繁。请稍后重新发送；已有回复可能不完整。
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(input)
          }}
        >
          <label htmlFor="agent-question" className="mb-2 block text-sm font-medium">
            你的问题
          </label>
          <textarea
            ref={inputRef}
            id="agent-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!configured || busy}
            maxLength={2000}
            rows={3}
            placeholder="例如：为什么选择在浏览器端进行推理？"
            aria-describedby="agent-input-help"
            className="focus:border-primary-500 focus:ring-primary-500 w-full resize-y rounded-xl border-gray-300 bg-transparent text-base disabled:opacity-50 dark:border-gray-700"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p id="agent-input-help" className="text-xs text-gray-500 dark:text-gray-400">
              {input.length} / 2000 · 点击发送提问
            </p>
            {busy ? (
              <button
                type="button"
                onClick={() => void stop()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              >
                停止生成
              </button>
            ) : (
              <button
                type="submit"
                disabled={!configured || !input.trim()}
                className="bg-primary-600 hover:bg-primary-700 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                发送
              </button>
            )}
          </div>
        </form>
        <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
          AI 回答可能有误，请以项目源码为准。发送内容将交由 DeepSeek
          处理；本站不持久保存会话，刷新后清空，长对话仅保留最近部分作为上下文。请勿输入敏感信息。
        </p>
      </div>
    </section>
  )
}
