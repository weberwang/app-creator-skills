# Node.js 最终集成证据

服务端直接使用公共 `INTEGRATION` 工作项与 `feature` / `final` 用途；无页面、场景或 V0–V5 阶段。早期功能集成不要求最终材料。最终集成提前冻结模块与行为范围，实施时记录真实结果，再由公共状态机检查并完成工作项。

所有引用均为项目相对 POSIX 路径和文件内容的 SHA-256：`{"path":"实际文件","sha256":"小写摘要"}`。下方 `REF` 仅为说明，不能作为真实证据。来源工作项、实施包、清单、交付文件和运行记录必须是实际文件；控制器能验证文件与关联关系，不能证明执行者没有伪造记录。

## 实施前范围

`integrationScopeRef` 指向包含 `schemaVersion: "1.0"`、当前 `workItemId`、`projectId`、`stack: "nodejs"` 的 JSON。`objects` 非空，每项代表一个当前项目中已 `COMPLETE` 的无视觉 `MODULE`，`objectId` 必须等于来源的 `workItemId`：

```json
{
  "objectId": "account-module",
  "workItemRef": "REF",
  "implementationPackageRef": "REF",
  "evidenceRef": "REF",
  "deliverableRefs": ["REF"]
}
```

实施包和清单路径必须与来源工作项中各自引用一致，摘要绑定其当前实际内容。`deliverableRefs` 覆盖实施包执行单元所声明所有权路径内的全部现存普通交付文件，不能遗漏文件、使用重复项，或把控制记录和证据冒充交付。空交付文件是合法的，但仍须绑定其实际摘要；控制记录和命令输出不得为空。声明目录会递归展开；星号模式必须有固定目录前缀，例如 `src/**/*.ts`。符号链接不作为交付文件，目录遍历排除 `.git`、`.workflow-control`、`.agents` 与 `node_modules`。

`cases` 非空，每项包含唯一的 `caseId` 与非空 `objectIds`，所有 ID 必须指向上述模块，并覆盖全部模块。范围必须在执行前冻结；最终结果不能删除对象、缩小对象集合或更改行为覆盖。范围、来源、实施包、清单及文件变化后须重新核对和执行受影响回归。

## 执行结果

`integrationEvidenceRef` 绑定汇总 JSON：包含同一 `schemaVersion`、`workItemId`、`projectId`、`stack`、`status: "PASS"`，以及与冻结范围逐项一致的 `objects` 和 `cases`。每个汇总 `cases` 项增加独立的 `evidenceRef` 指向实际行为记录：

```json
{
  "schemaVersion": "1.0",
  "workItemId": "integration-work",
  "projectId": "default-project",
  "stack": "nodejs",
  "caseId": "submit-order",
  "objectIds": ["account-module", "order-module"],
  "status": "PASS",
  "command": "实际执行的测试命令",
  "exitCode": 0,
  "outputRef": "REF"
}
```

汇总文件和各行为记录均须列入当前集成工作项的 Evidence Manifest，状态为 `PASS`。`outputRef` 指向当前工作项 `evidenceRoot` 内独立、非空且摘要正确的实际原始命令输出，不能指向工作项、实施包、范围、清单、汇总、其他行为记录、来源交付、来源证据或控制状态文件，也不能用硬链接别名绕过。执行者记录命令及实际退出码；控制器不执行这些命令，也不能仅凭 `exitCode: 0` 确认命令真实运行。

验收时重新严格检查每个来源工作项，并核对所有交付文件、范围、行为身份和输出。接口、权限、并发、数据库事务、错误路径或服务组合的覆盖依据当前项目需求明确，缺少数据库或外部依赖时记录未运行，不以静态检查代替实际集成结果。
