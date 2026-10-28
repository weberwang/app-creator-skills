using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Project.UnityWorkflow.Core;
using Project.UnityWorkflow.FontPipeline;
using Project.UnityWorkflow.Runtime;
using Unity.Pipeline.Commands;
using UnityEditor;
using UnityEngine;

namespace Project.UnityWorkflow.PipelineCommands
{
    /// <summary>项目已确认的语言清单。</summary>
    [Serializable]
    public sealed class ProjectLocales
    {
        /// <summary>项目支持的全部语言。</summary>
        public string[] languages;
        /// <summary>项目默认显示语言。</summary>
        public string defaultLanguage;
    }

    /// <summary>实际字体计划与项目语言清单的只读核对结果。</summary>
    [Serializable]
    public sealed class FontLocaleReport
    {
        /// <summary>项目语言中未由字体计划覆盖的项。</summary>
        public string[] missing;
        /// <summary>字体计划中未被项目选择的项。</summary>
        public string[] extra;
        /// <summary>重复、空值或其他结构错误。</summary>
        public string[] errors;
        /// <summary>是否满足集合和结构要求。</summary>
        public bool passed;
        /// <summary>真实运行初始化后的默认语言检查结果。</summary>
        public string startupDefaultStatus = "NOT_RUN";
        /// <summary>真实观察到的启动语言。</summary>
        public string startupLocale;
        /// <summary>应用与运行身份及采集时间。</summary>
        public string applicationId, productName, projectIdentity, runId, capturedAtUtc, expectedDefaultLanguage, planPath;
        /// <summary>实际采集的运行帧序号。</summary>
        public int capturedFrame;
    }

    /// <summary>读取真实 TMP 字体计划并核对项目语言，不改写项目资产。</summary>
    public static class ValidateFontLocalesCommand
    {
        /// <summary>在 Unity Editor 主线程读取实际资产和项目清单并返回结构化结果。</summary>
        /// <param name="planPath">Assets 内的 TmpFontAtlasPlan 资产路径。</param>
        /// <param name="languagePath">项目内语言清单 JSON 路径。</param>
        /// <param name="evidencePath">项目 Artifacts/validation 内的新增证据 JSON 路径。</param>
        /// <returns>只读检查的通过或失败报告。</returns>
        [CliCommand("uwt_validate_font_locales", "Validate selected project languages against an actual TMP font atlas plan.", MainThreadRequired = true)]
        public static PipelineCommandResult Execute(
            [CliArg("plan_path", "Project-relative TMP font atlas plan asset path.", Required = true)] string planPath,
            [CliArg("language_path", "Project-relative language selection JSON path.", Required = true)] string languagePath,
            [CliArg("evidence_path", "New JSON evidence path within Artifacts/validation.", Required = true)] string evidencePath)
        {
            try
            {
                WorkflowPaths.ResolveProjectRelative(planPath);
                string normalized = planPath.Replace('\\', '/');
                if (!normalized.StartsWith("Assets/", StringComparison.Ordinal)) throw new ArgumentException("字体计划必须位于 Assets 内。");
                TmpFontAtlasPlan plan = AssetDatabase.LoadAssetAtPath<TmpFontAtlasPlan>(normalized);
                if (plan == null) throw new InvalidDataException("字体计划资产不存在或类型不符。");
                string jsonPath = WorkflowPaths.ResolveProjectRelative(languagePath);
                ProjectLocales project = JsonUtility.FromJson<ProjectLocales>(File.ReadAllText(jsonPath));
                FontLocaleReport report = Compare(plan, project);
                // Editor 非播放态或初始化尚未捕获时不得把当前 Editor 语言冒充运行启动证据。
                StartupLocaleSnapshot startup = Application.isPlaying ? StartupLocaleObservation.Current : null;
                if (startup == null || string.IsNullOrWhiteSpace(startup.RunId) || string.IsNullOrWhiteSpace(startup.Locale))
                {
                    report.startupDefaultStatus = "NOT_RUN";
                    report.passed = false;
                    return PipelineCommandSupport.Fail("字体检查已完成；运行启动语言未捕获。", report);
                }
                string normalizedEvidence = (evidencePath ?? string.Empty).Replace('\\', '/');
                if (!normalizedEvidence.StartsWith("Artifacts/validation/", StringComparison.Ordinal) || !normalizedEvidence.EndsWith(".json", StringComparison.OrdinalIgnoreCase)) throw new ArgumentException("证据必须为 Artifacts/validation 内的新 JSON 文件。");
                WorkflowPaths.ResolveProjectRelative(normalizedEvidence);
                report.startupLocale = startup.Locale;
                report.applicationId = startup.ApplicationId;
                report.productName = startup.ProductName;
                // 项目路径指纹仅标识采样来源，启动结论来自运行时实际观察。
                using (var algorithm = SHA256.Create())
                {
                    report.projectIdentity = Convert.ToBase64String(algorithm.ComputeHash(Encoding.UTF8.GetBytes(WorkflowPaths.ProjectRoot)));
                }
                report.runId = startup.RunId;
                report.capturedAtUtc = startup.CapturedAtUtc;
                report.capturedFrame = startup.Frame;
                report.expectedDefaultLanguage = project?.defaultLanguage;
                report.planPath = normalized;
                report.startupDefaultStatus = string.Equals(startup.Locale, project?.defaultLanguage, StringComparison.OrdinalIgnoreCase) ? "PASS" : "FAIL";
                report.passed = report.passed && report.startupDefaultStatus == "PASS";
                ReportWriter.WriteNew(normalizedEvidence, report);
                return report.passed ? PipelineCommandSupport.Pass("字体与运行启动语言一致。", report) : PipelineCommandSupport.Fail("字体或运行启动语言不一致。", report);
            }
            catch (Exception exception) { return PipelineCommandSupport.FromException("字体语言检查", exception); }
        }

        /// <summary>比较实际计划的全部语言组与确认清单，并报告缺失、额外及重复项。</summary>
        /// <param name="plan">实际或测试构造的字体计划。</param>
        /// <param name="project">实际项目语言清单。</param>
        /// <returns>可检查的逐项结果。</returns>
        public static FontLocaleReport Compare(TmpFontAtlasPlan plan, ProjectLocales project)
        {
            var errors = new List<string>();
            var selected = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var actual = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (project?.languages == null || project.languages.Length == 0) errors.Add("项目语言清单为空。");
            else foreach (string code in project.languages) AddLanguage(selected, code, "项目语言", errors);
            if (string.IsNullOrWhiteSpace(project?.defaultLanguage) || !selected.Contains(project.defaultLanguage)) errors.Add("项目默认语言不在语言清单中。");
            if (plan == null || plan.Groups == null || plan.Groups.Length == 0) errors.Add("字体计划没有语言组。");
            else foreach (TmpFontAtlasGroup group in plan.Groups)
            {
                if (group?.LocaleCodes == null || group.LocaleCodes.Length == 0) { errors.Add("字体组没有语言。"); continue; }
                foreach (string code in group.LocaleCodes) AddLanguage(actual, code, "字体语言", errors);
            }
            var missing = selected.Except(actual, StringComparer.OrdinalIgnoreCase).OrderBy(code => code, StringComparer.OrdinalIgnoreCase).ToArray();
            var extra = actual.Except(selected, StringComparer.OrdinalIgnoreCase).OrderBy(code => code, StringComparer.OrdinalIgnoreCase).ToArray();
            return new FontLocaleReport { missing = missing, extra = extra, errors = errors.ToArray(), passed = errors.Count == 0 && missing.Length == 0 && extra.Length == 0 };
        }

        /// <summary>拒绝空白和重复语言，避免集合比较静默掩盖错误。</summary>
        private static void AddLanguage(HashSet<string> set, string code, string label, List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(code) || code != code.Trim()) errors.Add(label + "包含空值或前后空格。");
            else if (!set.Add(code)) errors.Add(label + "重复：" + code);
        }
    }
}
