/** 统一导出 schema 格式扩展。 */
import loadDependency from './dependencies.cjs';
const formats = loadDependency('ajv-formats');
export default formats.default ?? formats;
