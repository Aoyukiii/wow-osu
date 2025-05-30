import { Context, h, Schema } from 'koishi'
import { } from 'koishi-plugin-puppeteer'
import { TemplateReader } from './template'
import fs from 'fs'
import { auth, Modes_names, v2 } from 'osu-api-extended'
import { modes, PlayerStats } from './osu-adapter'

export interface Config {
  client_id: string
  client_secret: string
}

export const Config: Schema<Config> = Schema.object({
  client_id: Schema.string().required()
    .description('osu! API 客户端 ID。'),
  client_secret: Schema.string().required()
    .description('osu! API 客户端密钥。'),
})

export const name = 'wow-osu'

export const inject = ['puppeteer']

export async function apply(ctx: Context, config: Config) {
  try {
    await auth.login({
      type: 'v2',
      client_id: config.client_id,
      client_secret: config.client_secret,
      scopes: ['public']
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('401')) {
      ctx.logger.error('Authentication failed. Please check if your client ID and secret is correct.')
    }
    return
  }

  ctx.logger.info('Authentication successful.')


  ctx.command('test-template', '模板测试指令').option('empty', '-e')
    .action(async ({ session, options }) => {
      let user_data: {};
      if (options.empty === true) {
        user_data = {};
      } else {
        try {
          const data = await fs.promises.readFile(__dirname + '/templates/player-stats.hbs.json', 'utf8');
          user_data = JSON.parse(data);
        } catch (err) {
          ctx.logger.error(err)
          return '发生错误。';
        }
      }

      const html = await new TemplateReader().render('player-stats', user_data);

      const page = await ctx.puppeteer.page()
      await page.setContent(html)
      await page.evaluate(async () => {
        await document.fonts.ready;
      })

      const element = await page.$('.screenshot')
      const screenshot = await element.screenshot({ type: 'png' })
      await page.close()

      return h('div', h.quote(session.messageId), h.image(screenshot, 'image/png'))
    })

  ctx.command('osu <username>', 'osu!指令')
    .action(() => {
      if (!config.client_id || !config.client_secret) {
        return '请在配置中设置 osu! ID 和密钥。'
      }
      return 'osu! 指令已激活。使用 user 指令来获取用户数据。'
    })

  ctx.command('osu.user <username> [mode]', '获取玩家信息，默认模式为std。')
    .action(async ({ session }, username, mode) => {
      mode = mode || 'osu'
      if (!modes.includes(mode as Modes_names)) {
        return `无效的模式。可用模式: ${modes.join(', ')}。`
      }

      if (!username) {
        return '请输入用户名。'
      }

      try {
        const user_details = await v2.users.details({ user: username, mode: mode as Modes_names, key: "username" })
        if (user_details.error != null) {
          return `找不到用户 ${username}。`
        }

        const best_plays = await v2.scores.list({ type: "user_best", user_id: user_details.id, limit: 10 })
        if (best_plays.error != null) {
          return `找不到用户 ${username} 的最好成绩。`
        }

        const player_stats: PlayerStats = {
          mode: mode as Modes_names,
          user_details: user_details,
          best_plays: best_plays.map((play, index) => {
            // TODO: add grade to best_plays
            return {
              ...play,
              index: index + 1,
              difficulty_rating_str: play.beatmap.difficulty_rating.toFixed(2),
              pp_str: play.pp.toFixed(4),
              weight_pp_str: play.weight.pp.toFixed(4),
              accuracy_100_str: (play.accuracy * 100).toFixed(2),
            }
          })
        }

        await fs.promises.writeFile(
          __dirname + '/templates/player-stats.hbs.json',
          JSON.stringify(player_stats, null, 2)
        )

        // render template
        const html = await new TemplateReader().render('player-stats', player_stats);
        const page = await ctx.puppeteer.page()
        await page.setContent(html)
        await page.evaluate(async () => {
          await document.fonts.ready;
        })
        const element = await page.$('.screenshot')
        const screenshot = await element.screenshot({ type: 'png' })
        await page.close()

        return h('div', h.quote(session.messageId), h.image(screenshot, 'image/png'))
      } catch (error) {
        ctx.logger.error(error)
        return '发生错误。'
      }
    })
}

async function loadSvgs() {
  const dir = __dirname + '/templates/res/'
  const file_names = await fs.promises.readdir(dir, { withFileTypes: true });
  const svgs: { [key: string]: string } = {}
  for (const file_name of file_names) {
    const svg_content = await fs.promises.readFile(dir + file_name.name, 'utf8')
    svgs[file_name.name.replace('.svg', '')] = svg_content
  }
  return svgs
}
