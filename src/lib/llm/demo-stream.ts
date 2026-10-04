/**
 * 内置演示模型（local-demo）：不出网，本地按节奏“吐字”，用于离线体验完整流式链路。
 * 与桌面版的本地 mock 服务定位一致：没有真实 Key 也能跑通 新建章节 → 试写 → 流式追加 → 保存。
 */

const DEMO_PASSAGES: string[] = [
  `夜色像浸透了墨的旧棉布，一拧就能滴出水来。
巷子窄得只容两人并肩，两侧的青砖墙沁着潮气，苔痕一路爬到檐下。唯一一盏路灯悬在巷口，昏黄的光晕被雨丝搅碎，落在石板上，像一层将化未化的薄霜。
他收了伞，站在巷口听了很久——雨声底下，似乎还压着另一种声音，很轻，很匀，像谁在黑暗里翻动一沓旧纸。
他没有立刻往里走。直到那声音停了，巷子彻底静下来，他才把伞倒过来提在手里，一步步，踩进那片看不清的深处。`,
  `她把信纸折成第三折的时候，窗外的天光正好暗下去。
桌上摊着半盏冷掉的茶，茶面上浮着一层极薄的膜，像一句没说出口就凉了的话。她数过这封信的字数：一千四百二十一个，比上一封多出九个字。多的那九个字她改了四遍，最后又全部删掉，只留下句末的一个顿号——像门虚掩着，谁也没有推开。
楼下的电车当当地驶过，铃声拖出很长的一道尾音。她把信塞回抽屉最里层，压在那本蓝布面的旧账簿下面，然后起身，把灯拧亮了一格。
有些话不必寄出去。只要写得出来，这个人就还没有走远。`,
  `码头的雾要到正午才散。
桅杆一根根从雾里立起来，先是尖顶，再是半截帆，最后才是整条船——仿佛这些船不是开进港的，而是从雾里一寸一寸长出来的。岸上的人早已学会辨认：雾里第一个亮起来的灯笼，永远属于最早卸货的那条船。
少年蹲在缆桩上，手里攥着半块干饼。他不是在等船，他在等一个名字从别人嘴里说出来——三年了，只要这个名字还没在雾里断掉，他就继续等。
雾深处传来一声很轻的汽笛。`
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

/** 根据提示选择语料并生成“续写”文本（把提示的第一行作为引子回显在开头） */
function composeText(prompt: string): string {
  const seed = Array.from(prompt).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const main = DEMO_PASSAGES[seed % DEMO_PASSAGES.length]
  const second = DEMO_PASSAGES[(seed + 1) % DEMO_PASSAGES.length]
  const intro = prompt.trim().length > 0 ? `【演示生成 · 提示：${prompt.trim().slice(0, 40)}】\n\n` : ''
  return intro + main + '\n\n' + second
}

/** 模拟流式：每 30–50ms 吐 4–10 个字符，支持取消。返回完整文本。 */
export async function demoStreamChat(
  prompt: string,
  onDelta: (delta: string, full: string) => void,
  signal: AbortSignal
): Promise<string> {
  const full = composeText(prompt)
  await sleep(350, signal) // 模拟连接延迟
  const chars = Array.from(full)
  let sent = 0
  let acc = ''
  while (sent < chars.length) {
    if (signal.aborted) throw new Error('aborted')
    const step = 4 + Math.floor(Math.random() * 7)
    const chunk = chars.slice(sent, sent + step).join('')
    sent += step
    acc += chunk
    onDelta(chunk, acc)
    await sleep(25 + Math.floor(Math.random() * 25), signal)
  }
  return full
}
