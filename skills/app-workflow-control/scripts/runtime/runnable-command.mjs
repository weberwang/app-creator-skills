import { WorkflowError } from './io.mjs';

/** 仅排除明确的命令占位；保留多行脚本、重定向和带 HTML 字面量的真实命令。 */
export const RUNNABLE_COMMAND_PATTERN = '^(?!\\s*(?:<[^>\\r\\n]+>|[Tt][Oo][Dd][Oo]|[Tt][Bb][Dd]|待填写|待执行|待运行|待补充|占位命令)\\s*$)(?![\\s\\S]*<(?:执行|运行|填写|替换|实际|真实|必须|检查|命令|command|cmd|check|test|path|file)[^>\\r\\n]*>)[\\s\\S]*\\S[\\s\\S]*$';

/** 校验计划与结果中的命令文本，不执行命令，也不据此证明记录真实产生。 */
export function assertRunnableCommand(command, label = '验收命令') {
  if (typeof command !== 'string' || !new RegExp(RUNNABLE_COMMAND_PATTERN, 'u').test(command) || command.includes('\0')) {
    throw new WorkflowError(`${label} 必须是实际可复跑命令，不能使用空值或命令占位`);
  }
  return command;
}
