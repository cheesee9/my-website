import { z } from 'zod'

export const MAX_BODY_BYTES = 48 * 1024
export const MAX_INPUT_LENGTH = 2000
export const MAX_MESSAGES = 20
export const MAX_TOTAL_LENGTH = 12000

const messageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(['user', 'assistant']),
  parts: z
    .array(z.object({ type: z.literal('text'), text: z.string().trim().min(1) }))
    .min(1)
    .max(4),
})

export const chatRequestSchema = z
  .object({ messages: z.array(messageSchema).min(1).max(MAX_MESSAGES) })
  .superRefine(({ messages }, context) => {
    const valid =
      messages[0]?.role === 'user' &&
      messages.at(-1)?.role === 'user' &&
      new Set(messages.map((message) => message.id)).size === messages.length &&
      messages.every((message, index) => {
        const length = message.parts.reduce((sum, part) => sum + part.text.length, 0)
        return (
          length <= (message.role === 'user' ? MAX_INPUT_LENGTH : 6000) &&
          (index === 0 || message.role !== messages[index - 1].role)
        )
      }) &&
      messages.reduce(
        (sum, message) => sum + message.parts.reduce((size, part) => size + part.text.length, 0),
        0
      ) <= MAX_TOTAL_LENGTH
    if (!valid) context.addIssue({ code: 'custom', message: '会话格式错误或超出长度限制' })
  })

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function readChatRequest(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    throw new RequestError('请使用 JSON 格式发送消息。', 415)
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    throw new RequestError('消息过长，请精简后重试。', 413)
  }
  const reader = request.body?.getReader()
  if (!reader) throw new RequestError('消息不能为空。', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  const timer = setTimeout(() => void reader.cancel(), 10000)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new RequestError('消息过长，请精简后重试。', 413)
      }
      chunks.push(value)
    }
    let body: unknown
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new RequestError('消息格式不正确，请重新发送。', 400)
    }
    const result = chatRequestSchema.safeParse(body)
    if (!result.success) throw new RequestError('消息无效或会话过长，请清空会话后重试。', 400)
    return result.data
  } finally {
    clearTimeout(timer)
    reader.releaseLock()
  }
}

// 单进程基础保护；多实例部署需在平台配置共享限流，不能作为全站配额。
export function createRequestGate() {
  let startedAt = 0
  let count = 0
  let active = 0
  return () => {
    if (Date.now() - startedAt >= 60000) {
      startedAt = Date.now()
      count = 0
    }
    if (count >= 30 || active >= 3) return null
    count += 1
    active += 1
    let released = false
    return () => {
      if (!released) active -= 1
      released = true
    }
  }
}
