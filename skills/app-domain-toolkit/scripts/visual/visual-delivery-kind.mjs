const DELIVERY_BY_METHOD = new Map([
  ["image-generation", "raster-image"],
  ["authored-raster", "raster-image"],
  ["authored-svg", "vector-image"],
  ["reuse", "existing-asset"],
  ["runtime-program", "runtime-program"],
  ["cocos-graphics", "runtime-drawing"],
  ["phaser-graphics", "runtime-drawing"],
  ["threejs-graphics", "runtime-drawing"],
]);

/** 返回生产方式对应的交付类型，确保视觉路线和生产合同使用同一映射。 */
export function deliveryKindForProductionMethod(method) {
  return DELIVERY_BY_METHOD.get(method);
}
