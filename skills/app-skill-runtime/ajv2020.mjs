/** 统一导出 JSON Schema 2020 校验器，保留原专业合同验证能力。 */
import loadDependency from './dependencies.cjs';
const ajv = loadDependency('ajv/dist/2020.js');
export default ajv.default ?? ajv;
