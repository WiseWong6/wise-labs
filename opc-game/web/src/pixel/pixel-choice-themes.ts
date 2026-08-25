export type PixelTicketPattern = 'arrows' | 'checks' | 'coins' | 'grid' | 'ledger' | 'nodes' | 'seal' | 'signal' | 'stacks'

export interface PixelChoiceTheme {
  label: string
  ornament: string
  accent: string
  accentDark: string
  paper: string
  pattern: PixelTicketPattern
  optionMarks: Readonly<Record<string, string>>
}

export const pixelChoiceThemes: Readonly<Record<string, PixelChoiceTheme>> = {
  Q01: { label: 'BOOT / 启动', ornament: '▶', accent: '#78933f', accentDark: '#354c1f', paper: '#f1e5bb', pattern: 'arrows', optionMarks: { launch: 'GO', 'not-launching': '×' } },
  Q02: { label: 'ACCESS / 登录', ornament: 'ID', accent: '#6075a0', accentDark: '#2f405f', paper: '#e9e2c7', pattern: 'grid', optionMarks: { login: 'ID', guest: '→' } },
  Q03: { label: 'VALUE / 收益', ornament: '¥', accent: '#b07b32', accentDark: '#654018', paper: '#f3e2b5', pattern: 'coins', optionMarks: { profit: '¥', love: '♥' } },
  Q04: { label: 'FOUNDER / 创业', ornament: '◆', accent: '#a34f43', accentDark: '#5e2a24', paper: '#eee0c5', pattern: 'checks', optionMarks: { 'found-company': 'OPC', 'too-scared': '…' } },
  Q05: { label: 'REG / 注册', ornament: '章', accent: '#7c8b43', accentDark: '#404b21', paper: '#f0e4c1', pattern: 'seal', optionMarks: { register: '章', 'eat-instead': '饭' } },
  Q06: { label: 'SITE / 地址', ornament: '⌂', accent: '#8d6742', accentDark: '#50361f', paper: '#eee0c4', pattern: 'grid', optionMarks: { desk: '租', hosted: '挂', 'too-much': '退' } },
  Q07: { label: 'BANK / 公户', ornament: '▤', accent: '#4d7183', accentDark: '#263f4b', paper: '#e9e1c9', pattern: 'ledger', optionMarks: { 'open-bank-account': '户', 'stop-before-bank': '停' } },
  Q08: { label: 'PAY / 支付', ornament: '⇄', accent: '#4f815c', accentDark: '#284a31', paper: '#ece3c3', pattern: 'nodes', optionMarks: { 'wechat-pay': '微', alipay: '支', both: '双', 'run-away': '跑' } },
  Q09: { label: 'BOOK / 记账', ornament: '≣', accent: '#9a6141', accentDark: '#56321f', paper: '#f1e2c0', pattern: 'ledger', optionMarks: { 'agency-bookkeeping': '代', 'self-bookkeeping': '自', 'buy-sneakers': '鞋' } },
  Q10: { label: 'MODEL / 开发 AI', ornament: '✦', accent: '#765b9c', accentDark: '#3d2c58', paper: '#ebe0c7', pattern: 'nodes', optionMarks: { 'gpt-ultra': 'G', 'glm-pro': 'Z', 'kimi-code': 'K', 'free-tools': '0' } },
  Q11: { label: 'RUNTIME / 产品 AI', ornament: 'AI', accent: '#3d8390', accentDark: '#204952', paper: '#e7e1c9', pattern: 'signal', optionMarks: { 'no-runtime-ai': 'OFF', 'runtime-ai': 'AI', goodbye: 'BYE' } },
  Q12: { label: 'WEB / 域名', ornament: '◎', accent: '#4a73a1', accentDark: '#263f60', paper: '#ece2c4', pattern: 'nodes', optionMarks: { 'buy-domain-stack': '域', hotpot: '锅' } },
  Q13: { label: 'AUTH / 短信', ornament: '▥', accent: '#448579', accentDark: '#234a43', paper: '#e8e1c6', pattern: 'signal', optionMarks: { 'sms-login': '信', 'remove-login-and-commerce': '客', quit: '退' } },
  Q14: { label: 'CLOUD / 服务器', ornament: '▦', accent: '#586f8a', accentDark: '#303f52', paper: '#e9e1c9', pattern: 'stacks', optionMarks: { 'one-core-two-gb': '1C', 'two-core-four-gb': '2C', 'buy-clothes': '衫' } },
  Q15: { label: 'DISK / 存储', ornament: '▰', accent: '#6e7160', accentDark: '#3a3d32', paper: '#ebe2ca', pattern: 'stacks', optionMarks: { 'system-and-data-disk': '盘+', 'system-disk-only': '盘' } },
  Q16: { label: 'NET / 带宽', ornament: '≋', accent: '#3f7f8e', accentDark: '#234650', paper: '#e7e1c8', pattern: 'signal', optionMarks: { 'three-megabit': '3M', 'quit-after-spending': '退' } },
  Q17: { label: 'MIIT / 工信备案', ornament: '备', accent: '#496d99', accentDark: '#293e59', paper: '#ece2c2', pattern: 'seal', optionMarks: { 'submit-miit-filing': 'ICP备', 'quit-at-filing': '退' } },
  Q18: { label: 'POLICE / 公安备案', ornament: '盾', accent: '#455f80', accentDark: '#26364a', paper: '#e9dfc3', pattern: 'seal', optionMarks: { 'submit-police-filing': '公网安', 'quit-at-police-filing': '退' } },
  Q19: { label: 'SCOPE / 经营范围', ornament: '证', accent: '#aa7832', accentDark: '#614218', paper: '#f3e3b9', pattern: 'seal', optionMarks: { 'self-operated': '自营', 'self-published': '自发', 'all-in-capital': '平台', 'quit-license': '退' } },
  Q20: { label: 'RISK / 安全评估', ornament: '评', accent: '#b15e35', accentDark: '#66321b', paper: '#f0dfbd', pattern: 'checks', optionMarks: { 'no-public-expression': '无', 'self-assessment': '自评', 'third-party-assessment': '三方', 'quit-assessment': '退' } },
  Q21: { label: 'MLPS / 等保', ornament: '盾', accent: '#9f4540', accentDark: '#592421', paper: '#eee0c4', pattern: 'stacks', optionMarks: { 'level-two': 'L2', 'level-three': 'L3', 'quit-mlps': '退' } },
  Q22: { label: 'PRODUCT / 定位', ornament: '?', accent: '#735d91', accentDark: '#3c3050', paper: '#ebe1c8', pattern: 'checks', optionMarks: { 'clear-enough': '清', 'big-company-risk': '险', 'not-thought-through': '?', 'no-value': '退' } },
  Q23: { label: 'USER / 规模', ornament: '人', accent: '#5f8748', accentDark: '#314b26', paper: '#ede4c4', pattern: 'stacks', optionMarks: { 'users-100': '10²', 'users-1000': '10³', 'users-10000': '10⁴', 'users-100000': '10⁵' } },
  Q24: { label: 'PRICE / 定价', ornament: '¥', accent: '#b58531', accentDark: '#664913', paper: '#f3e4b7', pattern: 'coins', optionMarks: { 'price-9-9': '9.9', 'price-19-9': '19.9', 'price-29-9': '29.9', 'cannot-charge': '0' } },
  Q25: { label: 'GROWTH / 获客', ornament: '↑', accent: '#b05836', accentDark: '#63301d', paper: '#f0dfbb', pattern: 'arrows', optionMarks: { organic: 'KOL', 'paid-acquisition': 'ADS', 'launch-now': 'GO' } },
}

export function pixelChoiceThemeFor(questionId: string): PixelChoiceTheme {
  const theme = pixelChoiceThemes[questionId]
  if (!theme) throw new Error(`缺少像素票券主题：${questionId}`)
  return theme
}
