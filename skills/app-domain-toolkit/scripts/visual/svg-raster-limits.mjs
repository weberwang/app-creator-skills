/** 生产计划和转换器共用同一输出边长上限。 */
export const SVG_RASTER_MAX_DIMENSION = 4096;

/** 可编辑制作源的大小上限，读取文件前亦使用此值。 */
export const SVG_RASTER_MAX_SOURCE_BYTES = 4 * 1024 * 1024;

/** 输出使用 PNG 像素整数，保证在实际转换器范围内。 */
export function isSvgRasterDimension(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= SVG_RASTER_MAX_DIMENSION;
}
