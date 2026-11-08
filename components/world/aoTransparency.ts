// N8AO's transparency pass, same output for a fraction of the main-thread time
// (docs/research/performance.md, "N8AO").
//
// The scene has transparent things (labels, glass, decals), so N8AO runs transparency-aware:
// every frame it draws the transparent things again, twice, into two targets whose alpha and
// depth keep the ambient occlusion off them. Its own version walks the whole scene four times
// into a Map, and each of its two extra renders updates every matrix in the world again and
// redraws the shadow map with only the transparent casters in it. Here: one walk into flat
// arrays, the matrices and the shadow map the beauty pass made a moment ago, and the same objects
// drawn into the same targets. The composite only reads those targets' alpha and depth, so what
// reaches the screen is the same.
import * as THREE from "three";
import { DepthType, N8AOPostPass } from "n8ao";

type Pass = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  configuration: { depthBufferType: number };
  /** the beauty pass's depth (postprocessing's input buffer) */
  depthTexture: THREE.Texture;
  transparencyRenderTargetDWFalse: THREE.WebGLRenderTarget;
  transparencyRenderTargetDWTrue: THREE.WebGLRenderTarget;
  depthCopyPass: { material: THREE.ShaderMaterial; render: (r: THREE.WebGLRenderer) => void };
};

const objs: THREE.Mesh[] = [];
const was: boolean[] = [];
const clear = new THREE.Color();
const black = new THREE.Color(0, 0, 0);

function renderTransparency(this: Pass, renderer: THREE.WebGLRenderer) {
  const scene = this.scene;
  objs.length = 0;
  was.length = 0;
  scene.traverse((o) => {
    if ((o as THREE.Mesh).material) {
      objs.push(o as THREE.Mesh);
      was.push(o.visible);
    }
  });
  const oldBackground = scene.background;
  renderer.getClearColor(clear);
  const oldClearAlpha = renderer.getClearAlpha();
  const oldAutoClearDepth = renderer.autoClearDepth;
  const oldMatrices = scene.matrixWorldAutoUpdate;
  const oldShadows = renderer.shadowMap.autoUpdate;
  scene.background = null;
  scene.matrixWorldAutoUpdate = false; // the beauty pass updated them this frame
  renderer.shadowMap.autoUpdate = false; // nor does the shadow map need drawing again
  renderer.autoClearDepth = false;
  renderer.setClearColor(black, 0);
  this.depthCopyPass.material.uniforms.depthTexture.value = this.depthTexture;
  this.depthCopyPass.material.uniforms.reverseDepthBuffer.value = this.configuration.depthBufferType === DepthType.Reverse;
  try {
    // transparent objects WITHOUT depth write
    renderer.setRenderTarget(this.transparencyRenderTargetDWFalse);
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      const m = o.material as THREE.Material;
      o.visible = was[i] && ((m.transparent && !m.depthWrite && !o.userData.treatAsOpaque) || !!o.userData.cannotReceiveAO);
    }
    renderer.clear(true, true, true);
    this.depthCopyPass.render(renderer);
    renderer.render(scene, this.camera);
    // transparent objects WITH depth write
    renderer.setRenderTarget(this.transparencyRenderTargetDWTrue);
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      const m = o.material as THREE.Material;
      o.visible = was[i] && !!m.transparent && !!m.depthWrite && !o.userData.treatAsOpaque;
    }
    renderer.clear(true, true, true);
    this.depthCopyPass.render(renderer);
    renderer.render(scene, this.camera);
  } finally {
    for (let i = 0; i < objs.length; i++) objs[i].visible = was[i];
    objs.length = 0;
    scene.matrixWorldAutoUpdate = oldMatrices;
    renderer.shadowMap.autoUpdate = oldShadows;
    renderer.setClearColor(clear, oldClearAlpha);
    scene.background = oldBackground;
    renderer.autoClearDepth = oldAutoClearDepth;
  }
}

const proto = N8AOPostPass.prototype as unknown as { renderTransparency: typeof renderTransparency };
const original = proto.renderTransparency;
proto.renderTransparency = function (this: Pass, renderer: THREE.WebGLRenderer) {
  // dev and headless A/B: window.__aoOriginal = true draws with n8ao's own version
  if (process.env.NODE_ENV !== "production" && (window as unknown as { __aoOriginal?: boolean }).__aoOriginal) return original.call(this, renderer);
  return renderTransparency.call(this, renderer);
};
