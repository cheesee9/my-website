import type { UIMessage } from 'ai'

// 只把文本历史交给服务端；中断产生的空消息和 SDK 状态片段不进入上下文。
export function prepareChatMessages(messages: UIMessage[]) {
  const history: {
    id: string
    role: 'user' | 'assistant'
    parts: { type: 'text'; text: string }[]
  }[] = []
  for (const message of messages) {
    if (message.role === 'system') continue
    const text = message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim()
    if (!text) continue
    if (history.at(-1)?.role === message.role) history.pop()
    history.push({ id: message.id, role: message.role, parts: [{ type: 'text', text }] })
  }
  while (
    history.length > 19 ||
    history.reduce((sum, message) => sum + message.parts[0].text.length, 0) > 12000
  ) {
    history.shift()
  }
  if (history[0]?.role === 'assistant') history.shift()
  return history
}
