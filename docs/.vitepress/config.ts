import { defineConfig } from 'vitepress'
import { pagefindPlugin } from 'vitepress-plugin-pagefind';

function chineseSearchOptimize(input: string) {
  // @ts-ignore
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
  const result: string[] = [];
  for (const it of segmenter.segment(input)) {
    if (it.isWordLike) {
      result.push(it.segment);
    }
  }
  return result.join(' ');
}

export default defineConfig({
  title: "Tiaoom",
  description: "轻量级游戏房间引擎",
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: '棋牌室', link: '/game/' },
    ],

    sidebar: { 
      '/game/': [
        {
          text: '摸鱼棋牌室',
          items: [
            { text: '项目介绍', link: '/game/' },
            { text: '快速开始', link: '/game/getting-started' },
            { text: '调试部署', link: '/game/deploy' },
            { text: '开发详解', link: '/game/development' },
            { text: '游戏嵌入', link: '/game/embed' },
          ]
        }
      ],
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '游戏开发', link: '/guide/game-development' },
            { text: '通信实现', link: '/guide/communication' },
            { text: '错误处理', link: '/guide/error-handling' },
          ]
        },
        {
          text: 'API 参考',
          items: [
            { text: '服务端 API', link: '/guide/api/server' },
            { text: '客户端 API', link: '/guide/api/client' },
            { text: '事件列表', link: '/guide/api/events' },
            { text: '数据模型', link: '/guide/api/models' }
          ]
        }
      ]
    },

    socialLinks: [
      { 
        icon: { 
          svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 18q-.825 0-1.412-.587T2 16V8q0-.825.588-1.412T4 6h16q.825 0 1.413.588T22 8v8q0 .825-.587 1.413T20 18zm3-5v1q0 .425.288.713T8 15t.713-.288T9 14v-1h1q.425 0 .713-.288T11 12t-.288-.712T10 11H9v-1q0-.425-.288-.712T8 9t-.712.288T7 10v1H6q-.425 0-.712.288T5 12t.288.713T6 13zm7.5 2q.625 0 1.063-.437T16 13.5t-.437-1.062T14.5 12t-1.062.438T13 13.5t.438 1.063T14.5 15m3-3q.625 0 1.063-.437T19 10.5t-.437-1.062T17.5 9t-1.062.438T16 10.5t.438 1.063T17.5 12"/></svg>', 
        },
        ariaLabel: '游玩',
        link: 'https://room.adventext.fun'
      },
      { icon: 'github', link: 'https://github.com/FishPiOffical/tiaoom' }
    ]
  },
  vite: {
    plugins: [        
      pagefindPlugin({
        customSearchQuery: chineseSearchOptimize,
      }),
    ]
  }
})
