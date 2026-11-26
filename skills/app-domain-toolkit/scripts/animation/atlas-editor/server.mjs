import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { TARGETS } from "./core.mjs";
import { buildWorkflowBundle, encodePng } from "./workflow.mjs";

const base = import.meta.dirname;
const sourcesPrefix = "/api/workflow/frame/";
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".ts": "text/plain", ".cs": "text/plain", ".md": "text/plain" };

/** 只列出可随产物交付的适配模块、示例与使用说明。 */
export async function listAdapterFiles(target) {
  if (!TARGETS.includes(target)) throw new Error("未知目标引擎");
  const folder = join(base, "adapters", target);
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  const paths = entries.filter((entry) => entry.isFile())
    .map(({ parentPath, name }) => join(parentPath, name).slice(folder.length + 1).replaceAll("\\", "/"))
    .filter((file) => /^(?:[\w-]+\/)*[\w.-]+\.(?:mjs|ts|cs|md|html|json)$/u.test(file) && !/\.(?:test|spec)\./u.test(file))
    .sort();
  return paths.map((name) => ({ name, path: join(folder, name), url: `/adapters/${target}/${name}` }));
}

/** 输出 JSON 响应，一律禁止缓存以免复用旧工程的帧文件。 */
function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

/** 限制编辑工程上传大小，阻止超大请求占满本地工作进程。 */
async function readProject(req) {
  const chunks = [];
  let length = 0;
  if (req.headers["content-type"]?.split(";")[0] !== "application/json") throw new Error("需要 JSON 工程配置");
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 4 * 1024 * 1024) throw new Error("编辑工程超过 4 MiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks));
}

/** 只读取固定静态目录中格式受控的文件。 */
async function sendStatic(res, filename) {
  const type = types[extname(filename)] ?? "application/octet-stream";
  const data = await readFile(filename);
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
  res.end(data);
}

/** 创建本地调试应用，外部网页不能跨域访问项目图片和导出接口。 */
export function createEditorServer(workflow = null) {
  const sourceUrls = (workflow?.project.frames ?? []).map(({ id, source }, index) => ({
    id, name: source, url: sourcesPrefix + index,
  }));
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    const host = req.headers.host ?? "";
    if (!/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/u.test(host)
      || (req.headers.origin && req.headers.origin !== `http://${host}`)
      || req.headers["sec-fetch-site"] === "cross-site") {
      return json(res, { error: "编辑器只接受本机同源请求" }, 403);
    }
    try {
      const { pathname } = new URL(req.url, `http://${host}`);
      if (req.method === "POST" && pathname === "/api/workflow/export") {
        if (!workflow) return json(res, { error: "当前会话没有 V4 来源" }, 404);
        const bundle = await buildWorkflowBundle(workflow, await readProject(req));
        return json(res, {
          manifest: bundle.manifest,
          files: bundle.files.map(({ file, bytes }) => ({ file, base64: bytes.toString("base64") })),
        });
      }
      if (req.method !== "GET") return json(res, { error: "不支持的请求方式" }, 405);
      if (pathname === "/api/workflow") {
        return json(res, workflow ? { project: workflow.project, sources: sourceUrls } : null);
      }
      if (/^\/api\/workflow\/frame\/\d+$/u.test(pathname)) {
        const frame = workflow?.project.frames[Number(pathname.slice(sourcesPrefix.length))];
        if (!frame) return json(res, { error: "未找到来源帧" }, 404);
        const bytes = await encodePng({ ...frame, data: workflow.images.get(frame.id) });
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end(bytes);
      }
      const target = /^\/api\/adapters\/(\w+)$/u.exec(pathname)?.[1];
      if (target && TARGETS.includes(target)) {
        return json(res, (await listAdapterFiles(target)).map(({ name, url }) => ({ name, url })));
      }
      const adapterTarget = /^\/adapters\/(\w+)\//u.exec(pathname)?.[1];
      if (adapterTarget && TARGETS.includes(adapterTarget)) {
        const item = (await listAdapterFiles(adapterTarget)).find(({ url }) => url === pathname);
        if (item) return await sendStatic(res, item.path);
      }
      if (pathname === "/") return await sendStatic(res, join(base, "web", "index.html"));
      if (pathname === "/core.mjs" || /^\/web\/[\w-]+\.(?:css|mjs)$/u.test(pathname)) {
        return await sendStatic(res, join(base, pathname.slice(1)));
      }
      return json(res, { error: "未找到请求的文件" }, 404);
    } catch (error) {
      if (!res.headersSent && !res.destroyed) json(res, { error: error.message }, error.code === "ENOENT" ? 404 : 400);
    }
  });
}
