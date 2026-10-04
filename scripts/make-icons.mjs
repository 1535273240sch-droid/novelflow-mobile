/**
 * 零依赖图标生成器：用纯 Node 生成 NovelFlow App 图标 PNG。
 * 产物：
 *  - public/icons/icon-192.png / icon-512.png   （PWA manifest 与 favicon）
 *  - assets/icon.png（1024，Capacitor 参考图）
 *  - android mipmap 各密度 ic_launcher（若 android 工程已生成）
 */
import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

/* ---------- 极简 PNG 编码（RGBA 8bit） ---------- */
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/* ---------- 绘制：slate-900 底 + 蓝色圆角块 + 白色 N 字 ---------- */
function inRoundRect(x, y, x0, y0, w, h, r) {
  if (x < x0 || y < y0 || x >= x0 + w || y >= y0 + h) return false
  const dx = Math.max(x0 + r - x, x - (x0 + w - r), 0)
  const dy = Math.max(y0 + r - y, y - (y0 + h - r), 0)
  return dx * dx + dy * dy <= r * r
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)))
  const dx = px - (ax + abx * t)
  const dy = py - (ay + aby * t)
  return Math.hypot(dx, dy)
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const R = size * 0.18 // 画布圆角
  const inset = size * 0.1
  const bw = size - inset * 2 // 蓝色块边长
  const br = bw * 0.22
  const cx = size / 2
  const cy = size / 2
  const barW = bw * 0.13
  const halfH = bw * 0.24
  const leftX = cx - barW * 1.55
  const rightX = cx + barW * 0.55
  const diagHalf = barW * 0.52

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (!inRoundRect(x + 0.5, y + 0.5, 0, 0, size, size, R)) {
        rgba[i + 3] = 0
        continue
      }
      // 深蓝底（slate-900）
      let r = 15, g = 23, b = 42
      if (inRoundRect(x + 0.5, y + 0.5, inset, inset, bw, bw, br)) {
        // 蓝色渐变块（blue-500 → blue-700）
        const t = (y - inset) / bw
        r = Math.round(59 + (29 - 59) * t)
        g = Math.round(130 + (78 - 130) * t)
        b = Math.round(246 + (216 - 246) * t)
      }
      // 白色 N（两根竖条 + 斜杠），坐标限定在蓝色块内
      const inSquare = inRoundRect(x + 0.5, y + 0.5, inset, inset, bw, bw, br)
      const inLeftBar = inSquare && x + 0.5 >= leftX && x + 0.5 <= leftX + barW && Math.abs(y + 0.5 - cy) <= halfH
      const inRightBar = inSquare && x + 0.5 >= rightX && x + 0.5 <= rightX + barW && Math.abs(y + 0.5 - cy) <= halfH
      const inDiag =
        inSquare && distToSegment(x + 0.5, y + 0.5, leftX + barW / 2, cy - halfH, rightX + barW / 2, cy + halfH) <= diagHalf
      if (inLeftBar || inRightBar || inDiag) {
        r = 255; g = 255; b = 255
      }
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = 255
    }
  }
  return rgba
}

/** 盒式平均下采样 */
function downscale(rgba, size, target) {
  const out = Buffer.alloc(target * target * 4)
  const scale = size / target
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0
      const x0 = Math.floor(x * scale)
      const y0 = Math.floor(y * scale)
      const x1 = Math.min(size, Math.floor((x + 1) * scale))
      const y1 = Math.min(size, Math.floor((y + 1) * scale))
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * size + xx) * 4
          r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; a += rgba[i + 3]; n++
        }
      }
      const o = (y * target + x) * 4
      out[o] = Math.round(r / n)
      out[o + 1] = Math.round(g / n)
      out[o + 2] = Math.round(b / n)
      out[o + 3] = Math.round(a / n)
    }
  }
  return out
}

function writePng(path, rgba, size) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, encodePng(size, size, rgba))
}

const icon = drawIcon(1024)
writePng(join(root, 'assets', 'icon.png'), icon, 1024)
writePng(join(root, 'public', 'icons', 'icon-512.png'), downscale(icon, 1024, 512), 512)
writePng(join(root, 'public', 'icons', 'icon-192.png'), downscale(icon, 1024, 192), 192)

// Android 启动图标（若原生工程已生成则覆盖默认图标）
const resDir = join(root, 'android', 'app', 'src', 'main', 'res')
if (existsSync(resDir)) {
  const densities = [
    ['mipmap-mdpi', 48],
    ['mipmap-hdpi', 72],
    ['mipmap-xhdpi', 96],
    ['mipmap-xxhdpi', 144],
    ['mipmap-xxxhdpi', 192]
  ]
  for (const [dir, px] of densities) {
    const target = join(resDir, dir)
    if (!existsSync(target)) continue
    const png = encodePng(px, px, downscale(icon, 1024, px))
    writeFileSync(join(target, 'ic_launcher.png'), png)
    writeFileSync(join(target, 'ic_launcher_round.png'), png)
  }
  console.log('Android 启动图标已写入 android/app/src/main/res/mipmap-*')
}

console.log('图标已生成：assets/icon.png、public/icons/icon-192.png、icon-512.png')
