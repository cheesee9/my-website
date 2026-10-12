import AgentChat from '@/components/AgentChat'
import Link from '@/components/Link'
import { projectKnowledge } from '@/data/agentKnowledge'
import { genPageMetadata } from '../seo'

export const dynamic = 'force-dynamic'
export const metadata = genPageMetadata({
  title: '项目助手',
  description: '通过对话了解 cheesee9 独立开发的奶牛行为智能检测系统。',
})

export default function AgentPage() {
  return (
    <div className="space-y-7 py-6 sm:py-10">
      <header>
        <p className="text-primary-600 dark:text-primary-400 text-sm font-medium">
          cheesee9 / 项目助手
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          从一个问题，了解我的项目。
        </h1>
      </header>
      <AgentChat
        configured={Boolean(process.env.DEEPSEEK_API_KEY?.trim())}
        basePath={process.env.BASE_PATH || ''}
      />
    </div>
  )
}
