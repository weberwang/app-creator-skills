import assert from 'node:assert/strict';
import test from 'node:test';
import { validateUnityResponsiveContract, validateUnityResponsiveEvidence } from './visible-contract.mjs';

/** Unity 原生响应式合同最小有效夹具，基于正式 Unity 合同字段。 */
function unityContract() {
  return {
    version: 'unity-responsive/1.0', uiSystem: 'UGUI',
    logicalSpace: { mode: 'Canvas', referenceResolution: { width: 1920, height: 1080 }, unit: 'Unity logical units' },
    backbuffer: { source: 'Display', policy: 'measured', measuredAtRuntime: true },
    panel: { mode: 'Overlay', panelId: 'Canvas', runtimePanel: false },
    renderTexture: { enabled: false, format: 'none', resolutionPolicy: 'measured' },
    canvasScaler: { status: 'configured', enabled: true, mode: 'Scale With Screen Size', screenMatchMode: 'MatchWidthOrHeight', referenceResolution: { width: 1920, height: 1080 }, matchWidthOrHeight: 1 },
    panelSettings: { status: 'not-applicable', reason: 'UGUI' },
    camera: { id: 'Camera', renderMode: 'ScreenSpaceCamera', viewport: { width: 1920, height: 1080 }, projection: 'Orthographic', measuredAtRuntime: true },
    safeArea: { source: 'Screen.safeArea', policy: 'inset', measuredAtRuntime: true },
    inputCoordinates: { inputSystem: 'InputSystem', eventSystem: 'EventSystem', screenToLocal: 'RectTransformUtility', cameraRaycast: 'Camera' },
    resize: { mode: 'reflow', events: ['resize'], sameProcess: true },
    orientation: { supported: ['landscape'], runtimeReflow: true },
    textLocalization: { programmatic: false },
    resourceResolution: { sourceScale: 1, runtimeScalePolicy: 'platform', platformMeasured: true },
    performanceBudget: { frameTimeMs: 16, uiDrawCalls: 80, renderTexturePixels: 1000, memoryMb: 100, degradationPolicy: 'tier' },
    representativeViewports: [{ id: 'a', width: 1920, height: 1080, orientation: 'landscape' }, { id: 'b', width: 1280, height: 720, orientation: 'landscape' }],
    requiredRuntimeEvidence: ['gameView', 'screen', 'backbuffer', 'canvasScalerOrPanelSettings', 'camera', 'screenSafeArea', 'inputHit', 'resizeOrientationTrajectory', 'screenshot', 'supportedOrientations'],
  };
}


test('Unity 游戏只接受初始化所选单方向并核对参考尺寸和代表视口', () => {
 const base = unityContract();
 assert.deepEqual(validateUnityResponsiveContract(base), []);
 const portrait = structuredClone(base);
 portrait.orientation.supported = ['portrait'];
 portrait.logicalSpace.referenceResolution = {width:1080,height:1920};
 portrait.canvasScaler.referenceResolution = {width:1080,height:1920};
 portrait.canvasScaler.matchWidthOrHeight = 0;
 portrait.representativeViewports = [{id:'a',width:1080,height:1920,orientation:'portrait'}, {id:'b',width:720,height:1600,orientation:'portrait'}];
 assert.deepEqual(validateUnityResponsiveContract(portrait), []);
 for (const allowed of [[], ['portrait','landscape'], ['landscape','landscape'], ['auto'], ['diagonal']]) {
  const invalid=structuredClone(base); invalid.orientation.supported=allowed;
  assert.match(validateUnityResponsiveContract(invalid).join('\n'), /只能选择一个/);
 }
 const wrong=structuredClone(base);wrong.representativeViewports[0].width=900;wrong.representativeViewports[0].height=1600;
 assert.match(validateUnityResponsiveContract(wrong).join('\n'), /实测宽高/);
 const wrongReference=structuredClone(base);wrongReference.orientation.supported=['portrait'];
 assert.match(validateUnityResponsiveContract(wrongReference).join('\n'), /referenceResolution.*方向/);
});

test('Unity 运行方向拒绝 auto 和双方向，单方向仍要求同进程连续 resize', () => {
 // 此处只检查方向与轨迹门禁，其余真实运行材料由既有集成测试覆盖。
 const trajectory={sameProcess:true,events:[{type:'resize'},{type:'resize'}]};
 for (const supported of [['landscape'],['portrait']]) {
  const messages=validateUnityResponsiveEvidence({supportedOrientations:supported,resizeOrientationTrajectory:trajectory},{}).join('\n');
  assert.doesNotMatch(messages,/supportedOrientations|resizeOrientationTrajectory/);
 }
 for (const supported of [[],['auto'],['portrait','landscape']]) assert.match(validateUnityResponsiveEvidence({supportedOrientations:supported,resizeOrientationTrajectory:trajectory},{}).join('\n'),/supportedOrientations/);
 assert.match(validateUnityResponsiveEvidence({supportedOrientations:['portrait'],resizeOrientationTrajectory:trajectory},{responsiveContract:unityContract()}).join('\n'),/初始化选择/);
 assert.match(validateUnityResponsiveEvidence({supportedOrientations:['portrait'],resizeOrientationTrajectory:{sameProcess:false,events:trajectory.events}},{}).join('\n'),/连续 resize/);
});
