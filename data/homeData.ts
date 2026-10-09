const homeData = {
  current: {
    title: '完善个人网站',
    status: '进行中',
    description: '正在整理个人介绍与项目展示，让这里成为了解我的开发方向和作品的入口。',
  },
  featuredProject: {
    title: '奶牛行为智能检测系统',
    category: '计算机视觉 · Web 应用',
    description:
      '基于 YOLOv11 的奶牛行为检测与监控系统，支持图片、视频及实时摄像头检测，并提供行为统计和异常告警。',
    technologies: ['TypeScript', 'Next.js', 'ONNX Runtime Web', 'Prisma', 'PostgreSQL'],
    href: 'https://github.com/cheesee9/cow-behavior-detection',
  },
  agent: {
    // 填入实际可用的 Agent 地址后，首页会显示访问入口。
    href: '',
    pendingMessage: '个人 Agent 正在筹备，暂未开放对话。当前可以通过邮箱与我交流。',
  },
}

export default homeData
