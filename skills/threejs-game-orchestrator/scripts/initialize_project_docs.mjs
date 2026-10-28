#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { CORE_TEMPLATES, OPTIONAL_TEMPLATES } from "./project_doc_templates.mjs";
import { repoPath } from "../../app-workflow-control/scripts/runtime/io.mjs";
import { loadWork } from "../../app-workflow-control/scripts/runtime/workflow.mjs";
import { assertOwnedPath, loadProfile } from "../../app-workflow-control/scripts/runtime/validation.mjs";
import { assertNoOpenGrilling } from "../../app-workflow-control/scripts/runtime/artifacts.mjs";
import { createProjectDocInitializer } from "../../app-domain-toolkit/scripts/project/initialize-project-docs.mjs";

const tools = createProjectDocInitializer({ stack: "threejs", CORE_TEMPLATES, OPTIONAL_TEMPLATES, repoPath, loadWork, assertOwnedPath, loadProfile, assertNoOpenGrilling });
export const { parseIncludeList, validateProjectRoot, selectTemplates, initializeDocuments, runPreflight, main } = tools;

// 保留原有命令入口，仅直接执行时初始化项目文档。
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main();
