import Image from 'next/image'
import Link from '@/components/Link'
import homeData from '@/data/homeData'
import siteMetadata from '@/data/siteMetadata'

const textLink =
  'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium'

export default function Home() {
  const { current, featuredProject, agent } = homeData

  return (
    <div className="space-y-14 pb-8 sm:space-y-20">
      <section
        aria-labelledby="intro-title"
        className="grid gap-8 pt-4 pb-2 lg:grid-cols-[1.5fr_1fr] lg:items-center"
      >
        <div>
          <div className="mb-6 flex items-center gap-4">
            <Image
              src={siteMetadata.siteLogo}
              alt={siteMetadata.author + ' 的像素风猫咪头像'}
              width={72}
              height={72}
              className="h-18 w-18 rounded-2xl bg-white object-contain"
              priority
            />
            <p className="text-sm font-medium tracking-wide text-gray-600 dark:text-gray-400">
              TypeScript 全栈开发者
            </p>
          </div>
          <h1
            id="intro-title"
            className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl"
          >
            你好，我是
            <br />
            <span className="text-primary-600 dark:text-primary-400">{siteMetadata.author}。</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-gray-600 dark:text-gray-400">
            这里记录我的开发实践、正在做的事情，以及值得分享的项目。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="#projects"
              className="bg-primary-600 hover:bg-primary-700 rounded-xl px-5 py-3 font-medium text-white"
            >
              查看代表项目 <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href="#agent"
              className="rounded-xl border border-gray-300 px-5 py-3 font-medium hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              查看 Agent 状态
            </Link>
          </div>
        </div>
        <aside
          id="agent"
          tabIndex={-1}
          aria-labelledby="agent-title"
          className="scroll-mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="agent-title" className="text-xl font-semibold">
              个人 Agent
            </h2>
            <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
              {agent.href ? '已开放' : '筹备中'}
            </span>
          </div>
          <p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-400">
            {agent.href ? '个人 Agent 已开放，可通过下方入口访问。' : agent.pendingMessage}
          </p>
          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
            <Link href={agent.href || '#contact'} className={textLink}>
              {agent.href ? '打开 Agent' : '先通过邮箱联系我'} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </section>

      <section
        aria-labelledby="current-title"
        className="border-t border-gray-200 pt-8 dark:border-gray-800"
      >
        <div className="mb-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="text-primary-600 dark:text-primary-400 font-mono text-sm"
          >
            01
          </span>
          <h2 id="current-title" className="text-2xl font-bold tracking-tight">
            正在做什么
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr] sm:gap-8">
          <div>
            <p className="font-semibold">{current.title}</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{current.status}</p>
          </div>
          <p className="leading-7 text-gray-600 dark:text-gray-400">{current.description}</p>
        </div>
      </section>

      <section id="projects" tabIndex={-1} aria-labelledby="projects-title" className="scroll-mt-8">
        <div className="mb-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="text-primary-600 dark:text-primary-400 font-mono text-sm"
          >
            02
          </span>
          <h2 id="projects-title" className="text-2xl font-bold tracking-tight">
            代表项目
          </h2>
        </div>
        <article className="rounded-2xl border border-gray-200 p-6 sm:p-8 dark:border-gray-800">
          <p className="mb-3 text-xs font-medium tracking-widest text-gray-500 dark:text-gray-400">
            {featuredProject.category}
          </p>
          <h3 className="text-2xl font-semibold tracking-tight">{featuredProject.title}</h3>
          <p className="mt-4 max-w-2xl leading-7 text-gray-600 dark:text-gray-400">
            {featuredProject.description}
          </p>
          <ul aria-label="项目技术栈" className="mt-5 flex flex-wrap gap-2">
            {featuredProject.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {technology}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Link href={featuredProject.href} className={textLink}>
              查看项目源码 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </article>
      </section>

      <section
        id="contact"
        tabIndex={-1}
        aria-labelledby="contact-title"
        className="scroll-mt-8 border-t border-gray-200 pt-8 dark:border-gray-800"
      >
        <div className="mb-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="text-primary-600 dark:text-primary-400 font-mono text-sm"
          >
            03
          </span>
          <h2 id="contact-title" className="text-2xl font-bold tracking-tight">
            更多介绍与联系
          </h2>
        </div>
        <p className="leading-7 text-gray-600 dark:text-gray-400">
          想进一步了解我，或交流项目与开发经验，欢迎通过下面的方式联系。
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/about" className={textLink}>
            关于我 <span aria-hidden="true">→</span>
          </Link>
          <Link href={siteMetadata.github} className={textLink}>
            GitHub <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {[siteMetadata.email, siteMetadata.secondaryEmail].map((email) => (
            <li key={email}>
              <a
                href={'mailto:' + email}
                className="break-all text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-gray-900 dark:text-gray-400 dark:decoration-gray-700 dark:hover:text-gray-200"
              >
                {email}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
