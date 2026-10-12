import { createUIMessageStreamResponse } from 'ai'
import { handleChatStream } from '@mastra/ai-sdk'
import { createProjectMastra } from '../../../mastra'
import { createRequestGate, readChatRequest, RequestError } from '../../../lib/agent-request'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const enter = createRequestGate()
const unavailableMessage = '项目助手暂时无法回复，请稍后再试。'

function failure(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(status === 429 ? { 'Retry-After': '60' } : {}),
    },
  })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const requestUrl = new URL(request.url)
  const allowedOrigins = [requestUrl.origin]
  // Next.js 的内部 URL 可能使用 localhost，浏览器实际访问的是 Host 中的域名。
  const host = request.headers.get('host')
  if (host) allowedOrigins.push(`${requestUrl.protocol}//${host}`)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin)
    } catch {
      // 无效的站点配置不会放宽来源检查。
    }
  }
  if (origin && !allowedOrigins.includes(origin)) {
    return failure('请从本站打开项目助手。', 403)
  }
  let messages
  try {
    ;({ messages } = await readChatRequest(request))
  } catch (error) {
    return failure(
      error instanceof RequestError ? error.message : '请求未完成，请重试。',
      error instanceof RequestError ? error.status : 400
    )
  }
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return failure('项目助手尚未配置完成，请稍后再来。', 503)
  }
  const release = enter()
  if (!release) return failure('当前咨询较多，请稍后再试。', 429)
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal])
  const timer = setTimeout(() => controller.abort(), 45000)
  const cleanup = () => {
    clearTimeout(timer)
    release()
  }
  signal.addEventListener('abort', cleanup, { once: true })
  try {
    const stream = await handleChatStream({
      mastra: createProjectMastra(),
      agentId: 'project-assistant',
      version: 'v7',
      sendReasoning: false,
      sendSources: false,
      onError: () => unavailableMessage,
      // 只接受校验后的文本消息，不透传客户端 instructions/model/memory 等配置。
      params: {
        messages,
        abortSignal: signal,
        maxSteps: 1,
        modelSettings: { maxOutputTokens: 1200, maxRetries: 0, temperature: 0.3 },
        providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
      },
    })
    const reader = stream.getReader()
    return createUIMessageStreamResponse({
      headers: { 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
      stream: new ReadableStream({
        async pull(destination) {
          try {
            const { done, value } = await reader.read()
            if (done) {
              cleanup()
              if (controller.signal.aborted && !request.signal.aborted) {
                destination.enqueue({ type: 'error', errorText: '回复超时，请稍后重新发送。' })
              }
              destination.close()
            } else destination.enqueue(value)
          } catch {
            cleanup()
            destination.enqueue({ type: 'error', errorText: unavailableMessage })
            destination.close()
          }
        },
        async cancel() {
          controller.abort()
          cleanup()
          await reader.cancel()
        },
      }),
    })
  } catch {
    cleanup()
    return failure(unavailableMessage, 502)
  }
}
