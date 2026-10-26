/** 统一导出 YAML 解析器，不改变各专业工具的数据契约。 */
import loadDependency from './dependencies.cjs';
const yaml = loadDependency('yaml');
export default yaml;
export const { parse, stringify, parseDocument, isMap, isSeq } = yaml;
