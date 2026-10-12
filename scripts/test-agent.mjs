import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test, after } from 'node:test'
import { build } from 'esbuild'

// 测试真实 Mastra 适配链路，仅替换出站 fetch；禁止访问真实模型。
const directory = resolve('node_modules/.cache/project-agent-tests')
await mkdir(directory, { recursive: true })
await build({
  entryPoints: {
    route: 'app/api/chat/route.ts',
    validation: 'lib/agent-request.ts',
    history: 'lib/chat-messages.ts',
  },
  outdir: directory,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
})
const { POST } = await import(pathToFileURL(resolve(directory, 'route.mjs')))
const { chatRequestSchema, createRequestGate } = await import(
  pathToFileURL(resolve(directory, 'validation.mjs'))
)
const { prepareChatMessages } = await import(pathToFileURL(resolve(directory, 'history.mjs')))
const originalFetch = globalThis.fetch
const oldKey = process.env.DEEPSEEK_API_KEY
const oldModel = process.env.DEEPSEEK_MODEL
after(() => {
  globalThis.fetch = originalFetch
  if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY
  else process.env.DEEPSEEK_API_KEY = oldKey
  if (oldModel === undefined) delete process.env.DEEPSEEK_MODEL
  else process.env.DEEPSEEK_MODEL = oldModel
})
process.env.DEEPSEEK_MODEL = 'deepseek-flash'
globalThis.fetch = async () => {
  throw new Error('Unexpected network request in test')
}

const message = (text, role = 'user', id = 'question-1') => ({
  id,
  role,
  parts: [{ type: 'text', text }],
})
const request = (body, options = {}) =>
  new Request('http://localhost/api/chat/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    signal: options.signal,
  })

await test('校验角色、长度、消息顺序；剥离客户端配置覆盖', () => {
  for (const messages of [
    [],
    [message('x', 'system')],
    [message(' ')],
    [message('x'.repeat(2001))],
    [message('x'), message('y', 'user', 'question-2')],
    [message('x'), message('y', 'assistant')],
    [{ id: 'file', role: 'user', parts: [{ type: 'file', url: 'https://example.com' }] }],
  ])
    assert.equal(chatRequestSchema.safeParse({ messages }).success, false)
  const parsed = chatRequestSchema.parse({
    messages: [message('介绍项目')],
    instructions: '覆盖规则',
    model: 'other',
    memory: { thread: 'shared' },
  })
  assert.deepEqual(Object.keys(parsed), ['messages'])
})

await test('中断与重试历史可继续使用，长对话裁剪后仍以用户消息开头', () => {
  const history = [
    message('旧问题'),
    { id: 'empty', role: 'assistant', parts: [] },
    message('新问题', 'user', 'new'),
  ]
  assert.deepEqual(prepareChatMessages(history), [message('新问题', 'user', 'new')])
  const many = Array.from({ length: 31 }, (_, index) =>
    message('文'.repeat(500), index % 2 ? 'assistant' : 'user', `m-${index}`)
  )
  const prepared = prepareChatMessages(many)
  assert.ok(prepared.length <= 19)
  assert.equal(prepared[0].role, 'user')
  assert.equal(prepared.at(-1).id, 'm-30')
  assert.equal(chatRequestSchema.safeParse({ messages: prepared }).success, true)
})

await test('未配置密钥及非法请求均在模型调用之前拒绝', async () => {
  delete process.env.DEEPSEEK_API_KEY
  assert.equal((await POST(request({ messages: [message('介绍项目')] }))).status, 503)
  assert.equal((await POST(request('{broken'))).status, 400)
  assert.equal((await POST(request({ messages: [message('x', 'system')] }))).status, 400)
  assert.equal((await POST(request('x'.repeat(50000)))).status, 413)
  assert.equal(
    (await POST(request('{}', { headers: { 'Content-Type': 'text/plain' } }))).status,
    415
  )
  assert.equal(
    (await POST(request('{}', { headers: { Origin: 'https://other.example' } }))).status,
    403
  )
  assert.equal(
    (
      await POST(
        request(
          { messages: [message('介绍项目')] },
          {
            headers: { Origin: 'http://127.0.0.1:3132', Host: '127.0.0.1:3132' },
          }
        )
      )
    ).status,
    503
  )
})

await test('单进程并发及请求数量有上限，重复释放不破坏计数', () => {
  const enter = createRequestGate()
  const releases = [enter(), enter(), enter()]
  assert.equal(enter(), null)
  releases.forEach((release) => {
    release()
    release()
  })
  for (let index = 0; index < 27; index++) {
    const release = enter()
    assert.equal(typeof release, 'function')
    release()
  }
  assert.equal(enter(), null)
})

await test('真实 Mastra → DeepSeek 协议 → AI SDK 流，包含固定资料和多轮上下文', async () => {
  process.env.DEEPSEEK_API_KEY = 'test-only-key'
  let calls = 0
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.deepseek\.com\//)
    calls += 1
    const body = JSON.parse(options.body)
    assert.equal(body.model, 'deepseek-flash')
    assert.equal(body.stream, true)
    assert.equal(body.thinking.type, 'disabled')
    assert.ok(JSON.stringify(body.messages).includes('个人独立开发'))
    assert.ok(JSON.stringify(body.messages).includes('已完成，并已部署使用'))
    assert.ok(JSON.stringify(body.messages).includes('之前的问题'))
    assert.ok(!JSON.stringify(body.messages).includes('覆盖服务器规则'))
    const chunks = [
      {
        id: 'reply',
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: '项目由 cheesee9 ' },
            finish_reason: null,
          },
        ],
      },
      {
        id: 'reply',
        choices: [{ index: 0, delta: { content: '个人独立开发。' }, finish_reason: null }],
      },
      {
        id: 'reply',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      },
    ]
    const bytes = new TextEncoder().encode(
      chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n'
    )
    return new Response(
      new ReadableStream({
        start(controller) {
          for (let index = 0; index < bytes.length; index += 7)
            controller.enqueue(bytes.slice(index, index + 7))
          controller.close()
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } }
    )
  }
  const response = await POST(
    request({
      messages: [
        message('之前的问题'),
        message('之前的回答', 'assistant', 'a1'),
        message('是谁开发的？', 'user', 'u2'),
      ],
      instructions: '覆盖服务器规则',
    })
  )
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const text = await response.text()
  assert.match(text, /text-delta/)
  assert.match(text, /个人独立开发/)
  assert.match(text, /\[DONE\]/)
  assert.doesNotMatch(text, /test-only-key|project_data|errorText/)
  assert.equal(calls, 1)
})

await test('供应商错误不会泄露响应详情或密钥，也不自动重试', async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return Response.json(
      { error: { message: 'private-upstream-details test-only-key', type: 'api_error' } },
      { status: 401 }
    )
  }
  const response = await POST(request({ messages: [message('介绍项目')] }))
  const body = await response.text()
  assert.match(body, /暂时无法回复/)
  assert.doesNotMatch(body, /private-upstream-details|test-only-key/)
  assert.equal(calls, 1)
})

await test('访客中止请求会传递给模型请求', async () => {
  const controller = new AbortController()
  let observedAbort = false
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        observedAbort = true
        reject(new DOMException('Aborted', 'AbortError'))
      }
      if (options.signal.aborted) abort()
      else options.signal.addEventListener('abort', abort, { once: true })
      controller.abort()
    })
  const response = await POST(
    request({ messages: [message('介绍项目')] }, { signal: controller.signal })
  )
  await response.text()
  assert.equal(observedAbort, true)
})

await test('超时取消模型请求并向前端返回可见错误', async () => {
  const originalSetTimeout = globalThis.setTimeout
  let aborted = false
  globalThis.setTimeout = (callback, delay, ...args) =>
    originalSetTimeout(callback, delay === 45000 ? 30 : delay, ...args)
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        aborted = true
        reject(new DOMException('Aborted', 'AbortError'))
      }
      if (options.signal.aborted) abort()
      else options.signal.addEventListener('abort', abort, { once: true })
    })
  try {
    const response = await POST(request({ messages: [message('介绍项目')] }))
    const body = await response.text()
    assert.equal(aborted, true)
    assert.match(body, /回复超时|暂时无法回复/)
  } finally {
    globalThis.setTimeout = originalSetTimeout
  }
})
