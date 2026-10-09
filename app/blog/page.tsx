import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import { genPageMetadata } from 'app/seo'
import ListLayout from '@/layouts/ListLayoutWithTags'
import Link from '@/components/Link'

const POSTS_PER_PAGE = 5

export const metadata = genPageMetadata({ title: 'Blog' })

export default async function BlogPage(props: { searchParams: Promise<{ page: string }> }) {
  const posts = allCoreContent(sortPosts(allBlogs))
  if (posts.length === 0) {
    return (
      <div className="py-12">
        <h1 className="text-3xl font-bold">博客</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">暂未发布文章。</p>
        <Link
          href="/#projects"
          className="text-primary-600 dark:text-primary-400 mt-6 inline-block"
        >
          先看看我的项目 &rarr;
        </Link>
      </div>
    )
  }
  const pageNumber = 1
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE * pageNumber)
  const pagination = {
    currentPage: pageNumber,
    totalPages: totalPages,
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title="All Posts"
    />
  )
}
