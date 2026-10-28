/** 三栈控制领域参考的原始 Git 文件与审计摘要。 */
export const DOMAIN_SOURCE_HASHES = Object.freeze({
  cocos: { 'schemas': '3bf4c68dac1c142dd5e632ec90b65dc4fdaa9fd73e62c749cb6e2143584aed15', 'control-model': '68cf4dbb02320c803d45ce06c01a98426d7b52f2c7a920b007e56ec59ce2a8c4', 'state-gates': 'ad5eb488b04a2f0b60c24565e6e0b1e1c26da66f9cd5297667c2b87b7e8ded1b', 'simplified-workflow': 'c5206964142e6588de1e17ba991c7c4a7f6d78e76921cd1d054ffcf857d3fdaf' },
  phaser: { 'schemas': '927e95d598dade249e9eae2b2977f1e7ce8bb59fbb2aa9040531a3049c6cfd15', 'control-model': '3404fb9b9c2058afd918f7f841abc19203653e4ef01de97b395df58735acddaf', 'state-gates': 'ef485414a69e41aa79b9ac6a1cf3b7a419f2577a60bc612356250d14df497f63', 'simplified-workflow': '939fd13bce7f74f0b3c4d267ba440d6533555b15586fdc161f5214147da07066' },
  threejs: { 'schemas': '1562a92525db44bd56072b9d16a232d026f72663b9fe5301de0ad3575bbc5fd4', 'control-model': 'fa70a838666488779c68f3fa168c5b11088aaf66cde31f61d49d64369be2bb76', 'state-gates': '5a6da2ca835657532d190c3d5e7e6b06c8dcd0c6d297f2b0ea9dea816c13f02c', 'simplified-workflow': '36ce9a91128be6d14a77e63ee70322aef8c3456937ccdf0686e7766b2871c34c' },
});

/** 原控制入口也参与来源审计，防止未审阅的原生条款被覆盖。 */
export const DOMAIN_ENTRY_HASHES = Object.freeze({
  cocos: 'd5c9bf19352ba821aad71c9d50fbf77c8ab0461b3a2bb3a33327a689a71e8ab0',
  phaser: '462120fe89f035466a33db339d0ceff2931d4ac99934c7f90d82ea6fe26a4917',
  threejs: 'de549cd293c808a27b1a4e6c5ee406b7bbe47d8e458b91c6c0fa8e8e4090b049',
});

/** 一项能力对应一个公共主题；多源引用和按需入口由迁移目录统一生成。 */
export const DOMAIN_REFERENCE_FAMILIES = Object.freeze([
  { id: 'reference-domain-completion', title: '按实际完成情况验收', capability: 'app-quality-review', files: ['control-model'] },
  { id: 'reference-domain-display-ownership', title: '场景与显示层职责', capability: 'app-ui-layout', files: ['control-model'] },
  { id: 'reference-domain-visual-sequence', title: '视觉依赖生产次序', capability: 'app-asset-workflow', files: ['control-model'] },
  { id: 'reference-domain-visual-schema', title: '视觉资源格式与透明合同', capability: 'app-asset-workflow', files: ['schemas'] },
  { id: 'reference-domain-visual-gates', title: '视觉生产领域门禁', capability: 'app-quality-review', files: ['state-gates', 'simplified-workflow'] },
  { id: 'reference-domain-visual-admission', title: '视觉实施准入与证据', capability: 'app-quality-review', files: ['control-model', 'state-gates', 'schemas'] },
  { id: 'reference-domain-scene-contract', title: '场景视觉还原合同', capability: 'app-asset-workflow', files: ['schemas'] },
  { id: 'reference-domain-visual-review', title: '图片任务确认与文案', capability: 'app-asset-workflow', files: ['simplified-workflow', 'entry'] },
]);
