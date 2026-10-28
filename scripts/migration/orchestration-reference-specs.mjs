/** 已审计的编排和拷问源清单；源变更必须重新审核后更新摘要。 */
const HASHES = Object.freeze({
  cocos: {
    'worktree-integration': '69b594d3ea79d8b29987c0e11f005331d8a5db5c806dc66ba5bbcf26b374d225',
    'local-service-validation': '19ab4fef0399bc968a4bf0e9f73915968a023798a9e32d199532e65e4ea40246',
    'grilling-integration': 'c204da50d836c98a664127213cc059dee5f29b33c92650f4b05956eac975553c',
    'game-implementation': '80c194bb4f71cd7be41c29af01129f0806f826df9544710d2c1011da26d9d936',
    'visual-quality-gate': '028d08f5a664acc2704fe24504f560b3570de5049b3dd4bcf5912281f6837583',
    'module-decomposition': '245b6bb89a7cdfda380594230288c3805db453455ccb7bee341dba4f60a38ad1',
    'review-funnel': 'b3fc3f388e92661adfe6b9bb3669d986228f81928b4339a9c6d2c166c83ba139',
    'quality-gates': '3e6337fb32c2891a5a146ca7180d1487cb82f9da12ba7d4eda5ac9e7e1d640b4',
    'dependency-capability-profiles': 'e314267ec69070d92272f86f6f68d9308c31f4b5ad6d1f344cdad36b00b38c52',
    'technical-grilling': 'd5602d7a9d31914fc6fd527e63dda61637c2f62b20c3cec36aa66b2100591ee1',
    'technical-orchestration': '72ffda0562f712960ff6c9c2907a8004990fb9da56679bb2eaafdd4df44a8dfe',
  },
  phaser: {
    'worktree-integration': '69b594d3ea79d8b29987c0e11f005331d8a5db5c806dc66ba5bbcf26b374d225',
    'local-service-validation': '648a78289f4f2e89018f155b9c8f0f98d11f3909bfd238ce090d8bf9c97b34b4',
    'grilling-integration': '93a581f741d7d7965d68ba78ba00c2e93054cd882427c10d840e6c81ee7b6dbc',
    'game-implementation': '3ddb39069bff381e619372070c5949d5d751e4a72b197788e93fd33672ed4d49',
    'visual-quality-gate': '3b54d375b5f227c500ec761383cb60102bf02ef638eadd13ad86e6b8cd4677c6',
    'module-decomposition': '9d842387297bf86bf5701ff289701527c32ed43593be21d7f01e92667ff08117',
    'review-funnel': '211ab91c535ea980d9766aa5ef993ee5b7cd1dc0bfc3abe8cf956824a3722777',
    'quality-gates': '27cc93b5c5d6aeec8e05dc60bf7817d29d255f38a32b07351ef071a7968dbe6e',
    'dependency-capability-profiles': '1abb82d858659c22bdfdac941566e9655fb573eba51d7d4888389d165c1c6be5',
    'technical-grilling': 'c03e062b0c9296df2d2e4386faa257749c61848c140434dc4d311d2b5e89b957',
    'technical-orchestration': '38b0279bb8a73ab8e5fef9fe1749da765657f5b6adde55294abd58aa75f8f7be',
  },
  threejs: {
    'worktree-integration': '69b594d3ea79d8b29987c0e11f005331d8a5db5c806dc66ba5bbcf26b374d225',
    'local-service-validation': '648a78289f4f2e89018f155b9c8f0f98d11f3909bfd238ce090d8bf9c97b34b4',
    'grilling-integration': '1a9b4f9008f8423b0ce7f146635d7f642f8d006e9456d49e03c8f5016501b2c5',
    'game-implementation': '1ed819ccac2dff0e38ecc076abdda2ee64390d87c2cbc6ef9db971b2ae7d200d',
    'visual-quality-gate': 'e755b70f619ab61eb68e5e28dffdad68781700b35058e8f21a8eff2f23ec3eb0',
    'module-decomposition': '83c87114522fe0469758604ce40e9d9af8aace79108f57a51cb31dd9d7d0d7a4',
    'review-funnel': '699addd2dcaa7a3ceb022e2750a5f011b49efbee5e97f3b799012f54d78fabfd',
    'quality-gates': '71581dbffd946f3e4a4c9e135149657d113c4723762f078f280fdf77ff55510e',
    'dependency-capability-profiles': '8bf84bed43724f539821c83c197adc4d1c152e4077b4fda77205168959b02237',
    'technical-grilling': '2db7d5569b4cb6c06ef7f2c9d68aa0d78972588ca67aae832b1c5dca0bb37182',
    'technical-orchestration': 'c9da7e3b9d692ec5db856d38a55d62746fc355345a244ebecebe93b709ec78c6',
  },
});

const TITLES = Object.freeze({
  'worktree-integration': '经授权的并行工作区',
  'local-service-validation': '本地验证服务复用',
  'grilling-integration': '编排中的用户取舍与拷问',
  'game-implementation': '游戏实施与集成',
  'visual-quality-gate': '视觉质量专业复核',
  'module-decomposition': '模块拆分与交接',
  'review-funnel': '专业复核分工',
  'quality-gates': '游戏生产里程碑',
  'dependency-capability-profiles': '依赖与能力检查',
  'technical-grilling': '三栈具体拷问策略',
  'technical-orchestration': '三栈专业编排与交付',
});

/** 固定源仓库内真实路径，避免同名参考混入其他专业领域。 */
function sourcePath(stack, name) {
  const prefix = stack === 'phaser' ? 'phaser4' : stack;
  if (name === 'technical-orchestration') return `skills/${prefix}-game-orchestrator/SKILL.md`;
  return name === 'technical-grilling' ? 'skills/grilling/SKILL.md'
    : `skills/${prefix}-game-orchestrator/references/${name}.md`;
}

export const ORCHESTRATION_REFERENCE_FAMILIES = Object.freeze([
  ...Object.entries(TITLES).map(([name, title]) => ({
    id: `reference-orchestration-${name}`, title,
    capability: name === 'technical-grilling' || name === 'grilling-integration' ? 'grilling' : 'app-creator-workflow',
    sources: Object.entries(HASHES).map(([stack, values]) => ({ stack, sourcePath: sourcePath(stack, name), sourceSha256: values[name] })),
  })),
  { id: 'reference-orchestration-delivery-artifacts', title: '交付文件保留与引用', capability: 'app-creator-workflow', sources: [
    { stack: 'cocos', sourcePath: sourcePath('cocos', 'delivery-artifacts'), sourceSha256: '4aea032254226176f4c1c840c3096a034335bfb8babefd5a899eefdd0ecf568d' },
    { stack: 'phaser', sourcePath: sourcePath('phaser', 'delivery-artifacts'), sourceSha256: '91165f9221762a21e872c14ea580ba02d23c911dd5dba2710d68f6aa92d4343a' },
  ] },
]);

/** 交付参考虽不参与提取，仍登记 Git 清单，新增资料必须重新审阅。 */
export const ORCHESTRATION_TRACKED_REFERENCES = Object.freeze(Object.fromEntries(Object.keys(HASHES).map((stack) => {
  const prefix = stack === 'phaser' ? 'phaser4' : stack;
  const files = ['delivery-artifacts', ...Object.keys(TITLES).filter((name) => !['technical-grilling', 'technical-orchestration'].includes(name))];
  return [stack, [...files.map((name) => `skills/${prefix}-game-orchestrator/references/${name}.md`), `skills/${prefix}-game-orchestrator/SKILL.md`, 'skills/grilling/SKILL.md'].sort()];
})));
