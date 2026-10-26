/** 从统一运行依赖目录加载工具包；安装产物不引用开发机的源仓库。 */
const { createRequire } = require('node:module');
const { dirname } = require('node:path');
/** 允许的工具依赖与子入口，防止意外消费未声明的全局模块。 */
const TOOL_PACKAGES = new Set(['sharp', 'yaml', 'ajv', 'ajv/dist/2020.js', 'ajv-formats']);
/** 模块解析锚定当前资源包，源码测试也可使用仓库根已安装的依赖。 */
const requireTool = createRequire(__filename);

/** 加载唯一依赖实例，缺失时给出对应安装目录，不自动联网安装。 */
module.exports = function loadDependency(name) {
  if (!TOOL_PACKAGES.has(name)) throw new Error(`工具依赖未登记：${name}`);
  try { return requireTool(name); }
  catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    throw new Error(`工具依赖不可用：${name}。先执行 npm ci --prefix "${dirname(__filename)}"。`, { cause: error });
  }
};
