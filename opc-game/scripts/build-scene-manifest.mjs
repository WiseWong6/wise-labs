import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const quiz = JSON.parse(await readFile(resolve(root, 'content/quiz-v2.json'), 'utf8'))
const outputPath = resolve(root, 'design/storyboards/scene-manifest-v2.json')
const allowMissing = process.argv.includes('--allow-missing')

const briefs = [
  '清晨工作室里的可交互原型、上线按钮和满怀憧憬的创始人',
  '同时提供账号登录与游客直达的真实产品登录界面',
  'Codex Pro开发会员账单旁的商业化回本与为爱发电双路线',
  '个人项目跨向公司主体的设立服务大厅、执照轮廓和公司章',
  '公司注册代办窗口、吞下付款券的献祭火炉和受理资料夹',
  '有桌椅电源的真实工位与只有地址证明和信箱的挂靠方案',
  '银行企业业务柜台、开户材料、对公账户回执与网银UKey',
  '微信支付宝等多张渠道卡片组成的真实商户支付配置页',
  '代理记账公司、票据申报日历以及公司账和个人账分离',
  '开发桌上的四张Coding AI订阅卡、代码编辑器与空钱包',
  '最终产品里的AI功能开关、Token计量和供应商合规材料',
  'localhost浏览器、域名购物车、SSL安全锁与DNS解析表',
  '带+86手机号和验证码输入框的短信登录页与套餐卡',
  '真实云服务器购买页、两档规格负载和四件T恤退出梗',
  '同一服务器里的SYS系统盘和DATA数据盘双槽选择',
  '服务器到用户手机之间的3M窄带、排队加载和最后一插',
  '工信部ICP备案表单、公司域名接入资料与七日审核日历',
  '承接工信回执的公安联网备案窗口、拓扑材料与第二个七日历',
  '自营、自行发布和第三方平台三种经营样板与百万资本门槛文件',
  '发帖评论分享社群功能清单、自评风险矩阵与第三方报价信封',
  '服务器数据支付网络资产沙盘与二三级待定级压力预算文件',
  '回到工作室的用户场景需求竞品四栏定位白板和合规纸山',
  '同级的四档预计用户数卡片、容量人群和递增运营压力',
  '动态已花账本、三档月费卡与用户数乘月费的理论流水公式',
  '内容社群自然流、带CAC上限的广告台和今天上线发布闸',
]

function webpDimensions(bytes) {
  if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error('Not a WebP RIFF file')
  }
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const type = bytes.subarray(offset, offset + 4).toString('ascii')
    const size = bytes.readUInt32LE(offset + 4)
    const payload = offset + 8
    if (type === 'VP8X') {
      return {
        width: 1 + bytes.readUIntLE(payload + 4, 3),
        height: 1 + bytes.readUIntLE(payload + 7, 3),
      }
    }
    if (type === 'VP8 ') {
      return {
        width: bytes.readUInt16LE(payload + 6) & 0x3fff,
        height: bytes.readUInt16LE(payload + 8) & 0x3fff,
      }
    }
    if (type === 'VP8L') {
      const bits = bytes.readUInt32LE(payload + 1)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    offset = payload + size + (size % 2)
  }
  throw new Error('WebP dimensions not found')
}

async function describeAsset(publicUrl) {
  const file = `web/public${publicUrl}`
  try {
    const bytes = await readFile(resolve(root, file))
    const dimensions = webpDimensions(bytes)
    return {
      file,
      ...dimensions,
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
  } catch (error) {
    if (!allowMissing) throw new Error(`Missing or invalid scene asset ${file}: ${error.message}`)
    return { file, width: 0, height: 0, bytes: 0, sha256: 'pending' }
  }
}

const assets = {}
for (const [index, question] of quiz.questions.entries()) {
  const entry = {
    sceneId: question.visual.sceneId,
    brief: briefs[index],
    desktop: await describeAsset(question.visual.desktopAsset),
    mobile: await describeAsset(question.visual.mobileAsset),
  }
  const optionVariants = Object.entries(question.visual.optionVariants ?? {})
  if (optionVariants.length) {
    entry.optionVariants = Object.fromEntries(await Promise.all(optionVariants.map(async ([optionId, variant]) => {
      const described = {}
      for (const frame of ['action', 'resolved']) {
        const frameAssets = variant[frame]
        if (frameAssets?.desktopAsset && frameAssets?.mobileAsset) {
          described[frame] = {
            desktop: await describeAsset(frameAssets.desktopAsset),
            mobile: await describeAsset(frameAssets.mobileAsset),
          }
        }
      }
      if (variant.overlay) described.overlay = variant.overlay
      return [optionId, described]
    })))
  }
  assets[question.id] = entry
}

const manifest = {
  version: 2,
  states: ['idle', 'action', 'resolved', 'quit'],
  optionVariantContract: {
    key: 'question.visual.optionVariants[optionId]',
    format: 'action-resolved-single-frame-pairs',
    fallback: 'question.visual',
    overlay: 'escaped-dom-text',
  },
  frameRects: {
    desktop: {
      idle: [0, 0, 768, 512],
      action: [768, 0, 768, 512],
      resolved: [0, 512, 768, 512],
      quit: [768, 512, 768, 512],
    },
    mobile: {
      idle: [0, 0, 512, 768],
      action: [512, 0, 512, 768],
      resolved: [0, 768, 512, 768],
      quit: [512, 768, 512, 768],
    },
  },
  assets,
}

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${Object.keys(assets).length} scene entries to ${outputPath}${allowMissing ? ' (missing assets allowed)' : ''}.`)
