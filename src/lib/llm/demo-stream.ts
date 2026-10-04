/**
 * 内置古墨天工模拟模型（local-demo）：
 * - 不出网、免 API Key，可离线完整演练 7 大工作流阶段与标题生成
 * - 针对故事框架与章节规划智能输出合规 JSON
 * - 针对正文流式输出极具文采的古墨小说文字
 */

const NOVEL_CHAPTERS: string[] = [
  `暮色苍茫，徽墨浓淡。青石长街两侧的老茶肆挑着一盏残灯，灯纸早被去岁的春雨洇得发黄，在湿冷的暮风中瑟瑟摇晃。

林沉低着头，手指抚过腰间那柄未开刃的乌木戒尺，指尖触及冰凉的篆刻纹理，心头隐隐一动。三年前那桩轰动金陵的悬案，便是从这间名为“听雨轩”的茶肆起始。彼时茶香袅袅，而今却只剩尘灰与落叶。

“客官，打尖还是住店？”掌柜的声音沙哑苍老，擦拭桌面的旧抹布泛着酸涩气味。

林沉没有抬头，只是从袖中取出一枚温润的羊脂白玉飞燕坠，轻轻置于桌面。那玉坠雕工极巧，羽翼微敛，宛如随时将破空而去。

掌柜擦拭桌子的手骤然僵住，浑浊的双眼里掠过一丝无法掩饰的骇然：“这块飞燕……你从何处得来？”

门外檐角，忽有一阵极轻的脚步声伴着环佩相叩之音戛然而止。苏晚一袭黛青披风悄然立在门槛处，伞尖滑落的水珠在青石板上砸出一圈碎玉。她目光幽深地望着林沉，唇角微抿，却未发一言。命运的机杼，在这一刻悄然咬合。`,

  `夜雨初歇，云破月来。

苏晚推开临街的雕花木窗，潮湿的凉风夹杂着夜市残存的脂粉与药香扑面而来。她将桌上的古卷缓缓展开，那是一张以古法熟宣绘制的密图，图中山川城郭皆用极细的金线暗纹勾勒，历经甲子岁月，依旧熠熠生辉。

“当年苏家满门蒙冤，所有人都以为那幅《江山舆图》已葬身火海。”林沉倚在门框旁，目光沉静地注视着窗前纤瘦的背影，“却不知你一直将它藏在身边。”

苏晚回眸，清冷的月色洒在她如玉的面庞上：“若无此图，天下谁能知晓边关十三州兵饷的真正去向？林沉，你今夜入局，便再无回旋余地。”

林沉微微一笑，缓步走至案前，提笔蘸取朱砂，在图卷东南一角重重按下一记鲜红的印泥：“既然回不了头，那便踏出一条生路来。”`,

  `金陵城外的栖霞山巅，古枫如血。

朔风呼啸，猎猎吹动战旗。对决的时刻终于在破晓前降临。昔日暗藏幕后的权臣身披重甲，身后三千铁骑森然列阵，长矛如林，杀意如潮。

“林沉，你不过一介书生，何苦螳臂当车？”阴鸷的笑声在山谷回荡。

林沉立于危崖之上，长衫随风翻飞，目光明澈如渊：“天地有正气，杂然赋流形。下则为河岳，上则为日星。今日借这漫天朝霞，涤尽人间污浊！”

话音未落，林沉手中戒尺凌空一振，藏于尺中的三尺秋水霍然出鞘，剑鸣如龙吟九霄！与此同时，苏晚率领的勤王精锐自山谷两侧合围而至，号角声震彻云霄。

曙光冲破层云，万丈金芒洒满山河大川。旧案昭雪，天下初定，而两人的身影，已然隐入江南如画的烟雨之中。`
]

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

function composeSimulatedResponse(prompt: string): string {
  // 1. 判断是否是框架阶段
  if (prompt.includes('故事暂定名') || prompt.includes('world_setting') || prompt.includes('01_framework')) {
    return JSON.stringify(
      {
        title_suggestion: '墨染梨花雨',
        world_setting: '大乾承平末年，表面繁花似锦，暗里朝野倾轧、藩镇割据，江湖门阀与天子近卫暗卫相互牵制。',
        male_lead: {
          name: '林沉',
          identity: '前朝大理寺少卿遗孤，如今隐迹江南的墨坊掌案',
          personality: '沉稳孤傲，内敛深情，文心剑胆',
          goal: '彻查当年江南织造血案真相，为枉死先辈昭雪',
          flaw: '背负仇恨过重，难以轻信他人'
        },
        female_lead: {
          name: '苏晚',
          identity: '富甲一方的江南苏氏商行掌印千金',
          personality: '聪颖机敏，外柔内刚，擅识人心',
          goal: '守护家族基业，解开母亲遗留的铜锁之谜',
          flaw: '情深不寿，面对至亲之人难狠心肠'
        },
        supporting_characters: [
          { name: '赵无疾', role: '锦衣夜行校尉', trait: '行事狠辣却恪守底线' },
          { name: '枯木大师', role: '栖霞古寺住持', trait: '洞悉乾坤因果' }
        ],
        core_conflict: '追查真相必须掀开皇城禁秘，而真相的背后竟关乎天下苍生与至亲骨肉的生死抉择。',
        plot_outline: {
          qi: '金陵雨夜，一块飞燕玉坠揭开尘封旧案，林沉与苏晚因缘际会卷入漩涡。',
          cheng: '二人携手探查苏家密图，屡遭各方势力伏击，感情在生死同行中暗生情愫。',
          zhuan: '真相水落石出，幕后黑手竟是曾经最信赖的旧友，陷阱遍布绝境。',
          he: '栖霞山巅绝处逢生，破开迷局平定江南动荡，二人泛舟归隐烟雨间。'
        },
        ending_direction: '尘埃落定，天下海晏河清，携手泛舟五湖四海。'
      },
      null,
      2
    )
  }

  // 2. 判断是否是章节计划阶段
  if (prompt.includes('章节推进规划') || prompt.includes('02_plan') || prompt.includes('hook')) {
    return JSON.stringify(
      [
        {
          index: 1,
          title: '第一章 雨夜燕坠',
          target: '引出前尘旧案，林沉与苏晚首次产生交集',
          key_events: '听雨轩掌柜辨认玉坠，苏晚暗中现身试探',
          characters: ['林沉', '苏晚'],
          hook: '青石板巷深处传来的密令敲击声'
        },
        {
          index: 2,
          title: '第二章 舆图暗机',
          target: '破译熟宣图卷，揭露边关军饷亏空惊天秘密',
          key_events: '夜读《江山舆图》，刺客破窗袭杀，林沉戒尺出剑',
          characters: ['林沉', '苏晚', '赵无疾'],
          hook: '刺客腰间竟然悬着大理寺特有的腰牌'
        },
        {
          index: 3,
          title: '第三章 枫林破晓',
          target: '栖霞山决战，真相大白，匡扶正义后拂衣而去',
          key_events: '山巅对峙权臣，秋水出鞘破万军，大局初定',
          characters: ['林沉', '苏晚'],
          hook: '晨光破晓处，一叶扁舟顺流而下'
        }
      ],
      null,
      2
    )
  }

  // 3. 判断是否是标题阶段
  if (prompt.includes('候选书名') || prompt.includes('07_title') || prompt.includes('pitch')) {
    return JSON.stringify(
      [
        { title: '一砚梨花雨', type: '诗意文艺型', pitch: '墨染梨花，情深缘浅' },
        { title: '大乾镇妖录', type: '直白破题型', pitch: '斩妖除魔，步步为营' },
        { title: '长风踏歌行', type: '诗意文艺型', pitch: '纵马江湖，快哉平生' },
        { title: '问剑青云巅', type: '爆点爽意型', pitch: '一剑破万法，快意恩仇' },
        { title: '雾中回眸客', type: '悬念引人型', pitch: '层层剥茧，反转惊心' },
        { title: '天机不可泄', type: '悬念引人型', pitch: '算尽天机，唯漏一心' },
        { title: '绝品炼气士', type: '爆点爽意型', pitch: '扮猪吃虎，横推八荒' },
        { title: '沉晚辞归路', type: '直白破题型', pitch: '双星辉映，宿命同舟' }
      ],
      null,
      2
    )
  }

  // 4. 判断是否是去AI味或校对/润色
  if (prompt.includes('去 AI 味') || prompt.includes('校对') || prompt.includes('润色')) {
    const chunkMatch = prompt.match(/【待[^\n]+】\s*([\s\S]*)$/)
    if (chunkMatch && chunkMatch[1]) {
      // 对待处理文本进行洗练
      let text = chunkMatch[1].trim()
      text = text.replace(/不禁/g, '不由')
      text = text.replace(/嘴角勾起一抹弧度/g, '唇角微动')
      text = text.replace(/眼中闪过一丝/g, '目光微敛')
      text = text.replace(/深吸一口气/g, '平复心绪')
      return text
    }
  }

  // 默认正文生成：按索引选择丰富章节
  const idx = Math.abs(prompt.length % NOVEL_CHAPTERS.length)
  return NOVEL_CHAPTERS[idx]
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
