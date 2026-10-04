/**
 * 内置古墨天工模拟模型（local-demo）：
 * - 不出网、免 API Key，可离线完整演练 7 大工作流阶段与标题生成
 * - 动态解析用户填写的男主名、女主名、题材与核心想法，彻底杜绝固定模板与名字跑偏
 * - 纯正典雅全中文输出，严禁任何英文符号或杂质
 */

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('aborted'))
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('aborted'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

interface PromptContext {
  male: string
  female: string
  genre: string
  idea: string
  chapterIndex: number
}

function extractPromptContext(prompt: string): PromptContext {
  // 提取男主
  let male = '林沉'
  const m1 = prompt.match(/男主角唯一姓名：【([^】]+)】/)
  const m2 = prompt.match(/【法定男主（绝对不可更改）】\s*([^\n]+)/)
  const m3 = prompt.match(/【法定男主】\s*([^\n]+)/)
  const m4 = prompt.match(/男主[：: ]+([^\s；;\n，,]+)/)
  if (m1) male = m1[1].trim()
  else if (m2) male = m2[1].trim()
  else if (m3) male = m3[1].trim()
  else if (m4) male = m4[1].trim()

  // 提取女主
  let female = '苏晚'
  const f1 = prompt.match(/女主角唯一姓名：【([^】]+)】/)
  const f2 = prompt.match(/【法定女主（绝对不可更改）】\s*([^\n]+)/)
  const f3 = prompt.match(/【法定女主】\s*([^\n]+)/)
  const f4 = prompt.match(/女主[：: ]+([^\s；;\n，,]+)/)
  if (f1) female = f1[1].trim()
  else if (f2) female = f2[1].trim()
  else if (f3) female = f3[1].trim()
  else if (f4) female = f4[1].trim()

  // 提取题材
  let genre = '都市'
  const gMatch = prompt.match(/【题材类型】\s*([^\n]+)/)
  if (gMatch) genre = gMatch[1].trim()

  // 提取核心想法
  let idea = ''
  const iMatch = prompt.match(/【用户钦定剧情核心要求[^】]*】\s*([\s\S]*?)(?=\n【|$)/)
  if (iMatch && iMatch[1].trim()) {
    idea = iMatch[1].trim().replace(/^无[（(]AI[^\n]*$/, '')
  }

  // 提取章节编号
  let chapterIndex = 1
  const cMatch = prompt.match(/第\s*(\d+)\s*章/)
  if (cMatch) chapterIndex = parseInt(cMatch[1], 10) || 1

  return { male, female, genre, idea, chapterIndex }
}

function composeSimulatedResponse(prompt: string): string {
  const ctx = extractPromptContext(prompt)
  const ideaDesc = ctx.idea ? `【钦定主线】${ctx.idea}` : '风起云涌，宿命交错'

  // 1. 故事框架阶段
  if (prompt.includes('故事暂定名') || prompt.includes('world_setting') || prompt.includes('01_framework')) {
    return JSON.stringify(
      {
        title_suggestion: `${ctx.genre}卷·${ctx.male}传奇`,
        world_setting: `故事发生在风起云涌的${ctx.genre}世界中。表面繁华平静，暗流早已席卷各方势力。${ideaDesc}，成为打破这片天地宿命棋局的关键枢纽。`,
        male_lead: {
          name: ctx.male,
          identity: `${ctx.genre}世界中暗藏不凡身世的执棋者`,
          personality: '沉稳敏锐，行事果决，重情重义',
          goal: ctx.idea ? `履行核心誓约：${ctx.idea.slice(0, 30)}` : '拨开迷雾，勘破命途终局',
          flaw: '背负太重，过刚易折'
        },
        female_lead: {
          name: ctx.female,
          identity: '深涉各方旋涡的世家执印贵女',
          personality: '灵慧如玉，外柔内刚，擅辨人心',
          goal: '破除家族暗枷，与所信之人同舟共济',
          flaw: '情深不寿'
        },
        supporting_characters: [
          { name: '墨老', role: '幕后引渡人', trait: '洞悉乾坤机变' },
          { name: '冷锋', role: '宿命对手', trait: '行事狠辣有底线' }
        ],
        core_conflict: ctx.idea
          ? `围绕核心事件「${ctx.idea.slice(0, 40)}」展开的生死较量与信念抉择。`
          : '暗流倾轧与坚守本心之间的不可调和之争。',
        plot_outline: {
          qi: `开篇立局：${ctx.male}于长街初显峥嵘，暗流涌动，核心危机轰然引爆。`,
          cheng: `承前启后：${ctx.male}与${ctx.female}携手破局，勘破暗网蛛丝马迹。`,
          zhuan: `惊天逆转：绝境翻盘，幕后真凶浮出水面，付出惨痛代价。`,
          he: `终局定鼎：决战巅峰，扫尽阴霾，两道身影并肩笑对天地。`
        },
        ending_direction: '荡气回肠，余味悠长，海晏河清'
      },
      null,
      2
    )
  }

  // 2. 章节计划阶段
  if (prompt.includes('章节推进规划') || prompt.includes('02_plan') || prompt.includes('hook')) {
    return JSON.stringify(
      [
        {
          index: 1,
          title: '第一章 惊澜起微末',
          target: `${ctx.male}正式步入风云局，暗线危机初现`,
          key_events: `${ctx.male}现身长街茶肆；与${ctx.female}初次交锋试探；${ideaDesc.slice(0, 30)}`,
          characters: [ctx.male, ctx.female],
          hook: '青石板巷深处，一道冰冷的杀机悄然锁死'
        },
        {
          index: 2,
          title: '第二章 迷雾藏玄机',
          target: `揭开暗网一角，${ctx.male}身陷重围`,
          key_events: `勘破密图端倪；强敌伏击，${ctx.male}展露雷霆手段；二人结成同盟`,
          characters: [ctx.male, ctx.female, '墨老'],
          hook: '对手腰间竟佩戴着至亲的旧信物'
        },
        {
          index: 3,
          title: '第三章 锋芒定乾坤',
          target: `终局决战，打破宿命，真相昭然若揭`,
          key_events: `巅峰对峙；${ctx.male}破釜沉舟打破枷锁；长风万里尘埃落定`,
          characters: [ctx.male, ctx.female],
          hook: '晨光破晓处，携手笑看万里山河'
        }
      ],
      null,
      2
    )
  }

  // 3. 候选书名阶段
  if (prompt.includes('候选书名') || prompt.includes('07_title') || prompt.includes('pitch')) {
    return JSON.stringify(
      [
        { title: `${ctx.male}临天下`, type: '直白破题型', pitch: `${ctx.male}破开苍茫局` },
        { title: `一砚梨花雨`, type: '诗意文艺型', pitch: '墨染梨花，情深缘浅' },
        { title: `${ctx.genre}破局录`, type: '直白破题型', pitch: '步步为营，横扫迷障' },
        { title: `雾中回眸客`, type: '悬念引人型', pitch: '层层剥茧，反转惊心' },
        { title: `长风踏歌行`, type: '诗意文艺型', pitch: '纵马平生，快意恩仇' },
        { title: `天机不可泄`, type: '悬念引人型', pitch: '算尽天机，唯漏一心' },
        { title: `绝世傲骨锋`, type: '爆点爽意型', pitch: `${ctx.male}逆风翻盘，横扫八荒` },
        { title: `${ctx.male}晚归路`, type: '诗意文艺型', pitch: '双星辉映，宿命同舟' }
      ],
      null,
      2
    )
  }

  // 4. 去 AI 味或校对/润色阶段
  if (prompt.includes('去 AI 味') || prompt.includes('校对') || prompt.includes('润色')) {
    const chunkMatch = prompt.match(/【待[^\n]+】\s*([\s\S]*)$/)
    if (chunkMatch && chunkMatch[1]) {
      let text = chunkMatch[1].trim()
      text = text.replace(/不禁/g, '不由')
      text = text.replace(/嘴角勾起一抹弧度/g, '唇角微动')
      text = text.replace(/眼中闪过一丝/g, '目光微敛')
      text = text.replace(/深吸一口气/g, '平复心绪')
      text = text.replace(/空气仿佛凝固了/g, '四下寂然无声')
      text = text.replace(/Show,\s*Don't\s*Tell/gi, '')
      text = text.replace(/[a-zA-Z]/g, '') // 纯正中文保证
      return text
    }
  }

  // 5. 正文初稿动态生成（以用户男主、女主、核心剧情为绝对主轴！）
  const ideaNarrative = ctx.idea
    ? `那桩关于「${ctx.idea}」的风暴，已在暗中酝酿了整整三载。`
    : '青石长街两侧的老茶肆挑着一盏残灯，在湿冷的风中瑟瑟摇晃。'

  const chapterText1 = `暮色苍茫，徽墨浓淡。青石长街两侧的老茶肆挑着残灯，在湿冷的夜风中微微摇晃。

${ctx.male}低着头，手指缓缓收拢，指尖触及冰凉的衣袖边缘，心头激荡起层层波澜。${ideaNarrative}今天夜里，所有的伏笔都将在此刻破土而出。

“客官，打尖还是住店？”掌柜的声音沙哑苍老，目光有意无意地在${ctx.male}身上逡巡。

${ctx.male}没有抬头，只是从袖中取出一枚温润的玉佩，轻轻置于桌面。那玉佩雕工极细，在微弱的油灯下泛着微光。

掌柜擦拭桌面的手骤然僵住，浑浊的双眼里掠过一丝难以言喻的震动：“这枚信物……竟在你的手里？”

门外檐角，忽有一阵极轻的脚步声伴着微风悄然停歇。一袭黛青披风悄然立在门槛处，来人正是${ctx.female}。她手中的伞尖滑落雨滴，在石板上砸出一圈碎玉般的声响。她静静地凝视着${ctx.male}，唇角微微抿起，目光中带着审视与探寻。

属于${ctx.male}的传奇长卷，便在这一声清脆的滴水声中，霍然拉开大幕。`

  const chapterText2 = `更深露重，风雨初歇。

${ctx.female}推开临街的雕花长窗，潮湿的凉风夹杂着夜市残存的市井气息扑面而来。案几上平铺着那张泛黄的古旧图谱，那是全城各大势力明争暗夺的核心机密。

“所有人都以为这桩秘辛已被彻底焚毁。”${ctx.male}缓步走到案前，目光沉凝地注视着窗前那道纤细的身影，“却不知你早已将它暗中保全。”

${ctx.female}回过身，清冷的月光洒在她如玉的面庞上：“若无此物，天下间谁能知晓那场变故背后的真正黑手？${ctx.male}，你今夜踏入此局，便再无任何回头之路。”

${ctx.male}闻言淡然一笑，提笔蘸取研好的浓墨，在图谱的一角重重落下印记：“既然入了局，我${ctx.male}便从未打算回头。”

话音未落，楼外长巷骤然响起密集的破空锐响，数十道黑影如夜枭般掠上屋脊，杀意森森，已将整座楼阁围得水泄不通。`

  const chapterText3 = `天光破晓，晨曦微露。

决战的时刻终于在黎明前降临。昔日暗中操纵一切的对手身披沉重玄甲，森然立于高台之上，无数长矛森列如林，气氛压抑到了极点。

“你不过孤身一人，何苦逆天而行？”冷厉的嗤笑声在空旷处回荡。

${ctx.male}独立于高阶之上，衣袂随晨风猎猎作响，眼神却如寒潭深井般清澈坚毅：“天地有公道，岁月自留痕。今日我${ctx.male}站在这里，就是要将你们遮蔽的一切彻底掀开！”

电光石火之间，${ctx.male}身形若游龙疾走，掌风凌厉若惊雷裂空，以一己之力直破重重围锁！与此同时，${ctx.female}率领的增援人马自两侧长街合围而至，如狂潮决堤，瞬间涤荡全场。

晨光破开层层重云，万道金芒洒满巍峨城郭。宿怨得报，迷局勘破，${ctx.male}与${ctx.female}并肩立于高处，浩浩长风吹起衣角，天地之间唯余一片朗朗清辉。`

  if (ctx.chapterIndex === 2) return chapterText2
  if (ctx.chapterIndex >= 3) return chapterText3
  return chapterText1
}

export async function demoStreamChat(
  prompt: string,
  onDelta: (delta: string, full: string) => void,
  signal: AbortSignal
): Promise<string> {
  const full = composeSimulatedResponse(prompt)
  await sleep(200, signal)

  const chars = Array.from(full)
  let sent = 0
  let acc = ''
  while (sent < chars.length) {
    if (signal.aborted) throw new Error('aborted')
    const step = 6 + Math.floor(Math.random() * 8)
    const chunk = chars.slice(sent, sent + step).join('')
    sent += step
    acc += chunk
    onDelta(chunk, acc)
    await sleep(20 + Math.floor(Math.random() * 15), signal)
  }
  return full
}
