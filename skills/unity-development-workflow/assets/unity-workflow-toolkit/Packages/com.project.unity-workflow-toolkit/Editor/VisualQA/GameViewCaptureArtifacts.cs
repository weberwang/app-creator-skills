using System;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Project.UnityWorkflow.Core;
using UnityEngine;

namespace Project.UnityWorkflow.VisualQA
{
    /// <summary>负责 Game View PNG 与 JSON 证据对写入及既有产物完整性校验。</summary>
    internal static class GameViewCaptureArtifacts
    {
        private static readonly byte[] PngSignature = { 137, 80, 78, 71, 13, 10, 26, 10 };

        /// <summary>原子写入 PNG 与对应 JSON；任一落位失败时撤销本请求已落位的另一文件。</summary>
        /// <param name="request">固定任务身份和截图输出路径。</param>
        /// <param name="reportPath">配套 JSON 报告的项目相对路径。</param>
        /// <param name="result">包含真实采集范围和 UI 覆盖状态的终态报告。</param>
        /// <param name="pngBytes">Unity 从最终 Game View 帧编码出的 PNG 数据。</param>
        public static void WriteEvidencePair(
            GameViewCaptureRequest request,
            string reportPath,
            GameViewCaptureResult result,
            byte[] pngBytes,
            byte[] layoutBytes = null)
        {
            string absolutePngPath = WorkflowPaths.ResolveProjectRelative(request.outputPath);
            string absoluteReportPath = WorkflowPaths.ResolveProjectRelative(reportPath);
            string absoluteLayoutPath = !HasLayoutRequest(request.layoutMeasurement) ? null :
                WorkflowPaths.ResolveProjectRelative(request.layoutMeasurement.outputPath);
            string directory = Path.GetDirectoryName(absolutePngPath);
            if (string.IsNullOrEmpty(directory))
            {
                throw new InvalidOperationException("Game View 证据缺少父目录。");
            }

            bool directoryAlreadyExisted = Directory.Exists(directory);
            Directory.CreateDirectory(directory);
            absolutePngPath = WorkflowPaths.ResolveProjectRelative(request.outputPath);
            absoluteReportPath = WorkflowPaths.ResolveProjectRelative(reportPath);
            if (absoluteLayoutPath != null)
            {
                string layoutDirectory = Path.GetDirectoryName(absoluteLayoutPath);
                if (string.IsNullOrEmpty(layoutDirectory)) throw new InvalidOperationException("布局报告缺少父目录。");
                Directory.CreateDirectory(layoutDirectory);
                absoluteLayoutPath = WorkflowPaths.ResolveProjectRelative(request.layoutMeasurement.outputPath);
            }
            if (File.Exists(absolutePngPath) || File.Exists(absoluteReportPath) ||
                (absoluteLayoutPath != null && File.Exists(absoluteLayoutPath)))
            {
                throw new IOException("Game View 证据目标已被其他请求占用。");
            }

            string temporaryPng = Path.Combine(directory, "." + Path.GetFileName(absolutePngPath) + "." + Guid.NewGuid().ToString("N") + ".tmp");
            string temporaryReport = Path.Combine(directory, "." + Path.GetFileName(absoluteReportPath) + "." + Guid.NewGuid().ToString("N") + ".tmp");
            string temporaryLayout = absoluteLayoutPath == null ? null : Path.Combine(Path.GetDirectoryName(absoluteLayoutPath),
                "." + Path.GetFileName(absoluteLayoutPath) + "." + Guid.NewGuid().ToString("N") + ".tmp");
            bool pngPlaced = false;
            bool reportPlaced = false;
            bool layoutPlaced = false;
            try
            {
                File.WriteAllBytes(temporaryPng, pngBytes);
                // JSON.NET 显式保留 null，避免 Unity 内联序列化将可选引用展开成空对象。
                File.WriteAllText(temporaryReport, Newtonsoft.Json.JsonConvert.SerializeObject(result, Newtonsoft.Json.Formatting.Indented) + "\n", new UTF8Encoding(false));
                if (temporaryLayout != null)
                {
                    if (layoutBytes == null || layoutBytes.Length == 0) throw new InvalidOperationException("同帧布局报告为空。");
                    File.WriteAllBytes(temporaryLayout, layoutBytes);
                    File.Move(temporaryLayout, absoluteLayoutPath);
                    layoutPlaced = true;
                }
                File.Move(temporaryPng, absolutePngPath);
                pngPlaced = true;
                File.Move(temporaryReport, absoluteReportPath);
                reportPlaced = true;
            }
            catch
            {
                if (reportPlaced && File.Exists(absoluteReportPath))
                {
                    File.Delete(absoluteReportPath);
                }

                if (pngPlaced && File.Exists(absolutePngPath))
                {
                    File.Delete(absolutePngPath);
                }
                if (layoutPlaced && File.Exists(absoluteLayoutPath))
                {
                    File.Delete(absoluteLayoutPath);
                }

                throw;
            }
            finally
            {
                if (File.Exists(temporaryPng))
                {
                    File.Delete(temporaryPng);
                }

                if (File.Exists(temporaryReport))
                {
                    File.Delete(temporaryReport);
                }
                if (temporaryLayout != null && File.Exists(temporaryLayout))
                {
                    File.Delete(temporaryLayout);
                }

                if (!directoryAlreadyExisted && Directory.Exists(directory) && Directory.GetFileSystemEntries(directory).Length == 0)
                {
                    Directory.Delete(directory);
                }
            }
        }

        /// <summary>仅接受同身份且 PNG 可解码、尺寸和字节数与报告一致的既有 PASS 证据。</summary>
        /// <param name="request">当前回查 Job 的任务身份。</param>
        /// <param name="absoluteOutputPath">规范化的项目内 PNG 绝对路径。</param>
        /// <returns>合法同身份 PASS、明确占用错误；两份文件都不存在时返回 null。</returns>
        public static GameViewCaptureResult ReadExistingResult(GameViewCaptureRequest request, string absoluteOutputPath)
        {
            string reportPath;
            try
            {
                reportPath = WorkflowPaths.ResolveProjectRelative(Normalize(request.outputPath) + ".json");
            }
            catch (Exception)
            {
                return Failure("INVALID_REPORT_PATH", "采集报告路径不符合项目相对路径约束。", request);
            }

            if (!File.Exists(absoluteOutputPath) && !File.Exists(reportPath))
            {
                return null;
            }

            if (!File.Exists(absoluteOutputPath) || !File.Exists(reportPath))
            {
                return Failure("INCOMPLETE_EXISTING_ARTIFACT", "输出路径已有不完整旧文件，已拒绝覆盖。", request);
            }

            try
            {
                GameViewCaptureResult saved = JsonUtility.FromJson<GameViewCaptureResult>(File.ReadAllText(reportPath, new UTF8Encoding(false, true)));
                if (!MatchesIdentity(request, saved))
                {
                    return Failure("OUTPUT_IDENTITY_CONFLICT", "输出路径已被其他采集身份占用或报告无效。", request);
                }

                byte[] pngBytes = File.ReadAllBytes(absoluteOutputPath);
                if (!IsPngSignature(pngBytes) || !HasCompleteCaptureReport(request, saved, pngBytes.LongLength))
                {
                    return Failure("EXISTING_ARTIFACT_INVALID", "既有 PNG 或采集报告损坏、不匹配，已拒绝复用。", request);
                }
                if ((!string.IsNullOrEmpty(saved.screenshot.sha256) &&
                     !string.Equals(saved.screenshot.sha256, HashBytes(pngBytes), StringComparison.Ordinal)) ||
                    (HasLayoutRequest(request.layoutMeasurement) && string.IsNullOrEmpty(saved.screenshot.sha256)))
                {
                    return Failure("EXISTING_ARTIFACT_INVALID", "既有截图字节摘要与采集记录不一致，已拒绝复用。", request);
                }
                if (!HasValidLayoutEvidence(request, saved))
                {
                    return Failure("EXISTING_LAYOUT_INVALID", "同帧布局报告缺失、内容变化或请求身份不一致，已拒绝复用。", request);
                }

                Texture2D decoded = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                try
                {
                    if (!ImageConversion.LoadImage(decoded, pngBytes, true) ||
                        decoded.width != saved.screenshot.width || decoded.height != saved.screenshot.height)
                    {
                        return Failure("EXISTING_ARTIFACT_INVALID", "PNG 无法解码，或实际尺寸与报告不一致。", request);
                    }
                }
                finally
                {
                    DestroyTexture(decoded);
                }

                // 旧截图报告没有可选字段，Unity 可能将空引用还原为空实例。
                if (!HasLayoutRequest(request.layoutMeasurement))
                {
                    saved.layoutMeasurement = null;
                    saved.layoutRequestSha256 = null;
                }
                if (string.IsNullOrEmpty(saved.screenshot.sha256)) saved.screenshot.sha256 = null;
                return saved;
            }
            catch (Exception)
            {
                return Failure("EXISTING_ARTIFACT_INVALID", "既有 PNG 或采集报告无法读取或解码，已拒绝复用。", request);
            }
        }

        /// <summary>使用实际字节生成与工作流一致的小写 SHA-256。</summary>
        public static string HashBytes(byte[] bytes)
        {
            using (SHA256 hash = SHA256.Create())
            {
                return BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-", string.Empty).ToLowerInvariant();
            }
        }

        /// <summary>冻结全部嵌套布局参数，防止轮询时以同路径替换测量范围。</summary>
        public static string HashLayoutRequest(LayoutMeasurementRequest request)
        {
            return !HasLayoutRequest(request) ? null : HashBytes(Encoding.UTF8.GetBytes(JsonUtility.ToJson(request)));
        }

        /// <summary>Unity 内联反序列化可能为缺失字段构造空对象，按完整空值识别未请求布局。</summary>
        public static bool HasLayoutRequest(LayoutMeasurementRequest request)
        {
            return request != null && (!string.IsNullOrEmpty(request.outputPath) || !string.IsNullOrEmpty(request.taskId) ||
                !string.IsNullOrEmpty(request.candidateId) || !string.IsNullOrEmpty(request.scenePath) ||
                !string.IsNullOrEmpty(request.layoutPlanPath) || !string.IsNullOrEmpty(request.uiSystem) ||
                !string.IsNullOrEmpty(request.coordinateSpace) || !string.IsNullOrEmpty(request.gapAxis) ||
                !string.IsNullOrEmpty(request.stateId) || !string.IsNullOrEmpty(request.evidenceRoot) ||
                request.includeComponentSnapshots || request.textOnly ||
                (request.targets != null && request.targets.Count > 0));
        }

        /// <summary>重读原生布局报告，核对请求、帧号、任务与真实摘要。</summary>
        private static bool HasValidLayoutEvidence(GameViewCaptureRequest request, GameViewCaptureResult result)
        {
            if (!HasLayoutRequest(request.layoutMeasurement))
            {
                return (result.layoutMeasurement == null || string.IsNullOrEmpty(result.layoutMeasurement.path)) &&
                       string.IsNullOrEmpty(result.layoutRequestSha256);
            }
            GameViewLayoutMeasurement reference = result.layoutMeasurement;
            if (reference == null || !string.Equals(result.layoutRequestSha256, HashLayoutRequest(request.layoutMeasurement), StringComparison.Ordinal) ||
                !string.Equals(reference.path, Normalize(request.layoutMeasurement.outputPath), StringComparison.Ordinal) ||
                reference.frameCount != result.screenshot.frameCount || string.IsNullOrWhiteSpace(reference.runId)) return false;
            string path = WorkflowPaths.ResolveProjectRelative(reference.path);
            if (!File.Exists(path)) return false;
            byte[] bytes = File.ReadAllBytes(path);
            if (bytes.Length == 0 || !string.Equals(reference.sha256, HashBytes(bytes), StringComparison.Ordinal)) return false;
            var report = JsonUtility.FromJson<LayoutMeasurementReport>(Encoding.UTF8.GetString(bytes));
            return report != null && (report.status == "PASS" || report.status == "MEASURED") &&
                   report.measurementSource == "UNITY_EDITOR_LOADED_SCENE" && report.includesComponentSnapshots &&
                   report.runId == reference.runId && report.frameCount == reference.frameCount &&
                   report.taskId == request.taskId && report.candidateId == request.candidateId &&
                   report.scenePath == Normalize(request.scenePath) && report.outputPath == reference.path;
        }

        /// <summary>确认 PNG 文件签名完整，拒绝空文件和误命名的其他图像格式。</summary>
        private static bool IsPngSignature(byte[] bytes)
        {
            if (bytes == null || bytes.Length < PngSignature.Length)
            {
                return false;
            }

            for (int index = 0; index < PngSignature.Length; index++)
            {
                if (bytes[index] != PngSignature[index])
                {
                    return false;
                }
            }

            return true;
        }

        /// <summary>交叉验证任务身份、帧范围、UI 覆盖和声明尺寸，不读取像素作视觉结论。</summary>
        private static bool HasCompleteCaptureReport(GameViewCaptureRequest request, GameViewCaptureResult result, long byteCount)
        {
            GameViewScreenshot screenshot = result.screenshot;
            GameViewUiCoverage coverage = result.uiCoverage;
            return result.status == "PASS" &&
                   result.captureScope == "EDITOR_GAME_VIEW_END_OF_FRAME" &&
                   string.Equals(result.requestedOutputPath, Normalize(request.outputPath), StringComparison.Ordinal) &&
                   screenshot != null && screenshot.width > 0 && screenshot.height > 0 &&
                   screenshot.sizeBytes == byteCount &&
                   string.Equals(screenshot.path, Normalize(request.outputPath), StringComparison.Ordinal) &&
                   IsUtcTimestamp(screenshot.capturedAtUtc) && screenshot.frameCount >= 0 &&
                   coverage != null && coverage.scope == "FINAL_GAME_VIEW_FRAME" &&
                   coverage.pixelAnalysis == "NOT_PERFORMED" && !string.IsNullOrWhiteSpace(coverage.note) &&
                   (coverage.status == "CAPTURED_UNANALYZED" || coverage.status == "PARTIAL_UNCLASSIFIED" ||
                    coverage.status == "NO_RUNTIME_UI_FOUND") &&
                   IsUtcTimestamp(result.generatedAtUtc);
        }

        /// <summary>验证报告中的任务、候选、场景及输出路径均与当前请求绑定。</summary>
        private static bool MatchesIdentity(GameViewCaptureRequest request, GameViewCaptureResult result)
        {
            return result != null && result.status == "PASS" &&
                   string.Equals(result.taskId, request.taskId, StringComparison.Ordinal) &&
                   string.Equals(result.candidateId, request.candidateId, StringComparison.Ordinal) &&
                   string.Equals(result.scenePath, Normalize(request.scenePath), StringComparison.Ordinal) &&
                   result.screenshot != null &&
                   string.Equals(result.screenshot.path, Normalize(request.outputPath), StringComparison.Ordinal);
        }

        /// <summary>验证报告时间为可解析的 UTC 时间，阻止不完整旁路 JSON 冒充采集记录。</summary>
        private static bool IsUtcTimestamp(string value)
        {
            return !string.IsNullOrWhiteSpace(value) && value.EndsWith("Z", StringComparison.Ordinal) &&
                   DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out _);
        }

        /// <summary>根据 Unity 当前运行状态释放临时校验纹理。</summary>
        private static void DestroyTexture(Texture2D texture)
        {
            if (texture == null)
            {
                return;
            }

            if (Application.isPlaying)
            {
                UnityEngine.Object.Destroy(texture);
            }
            else
            {
                UnityEngine.Object.DestroyImmediate(texture);
            }
        }

        /// <summary>生成不含主机路径的明确失败结果。</summary>
        private static GameViewCaptureResult Failure(string code, string message, GameViewCaptureRequest request)
        {
            return new GameViewCaptureResult
            {
                status = "FAIL",
                errorCode = code,
                message = message,
                taskId = request.taskId,
                candidateId = request.candidateId,
                scenePath = Normalize(request.scenePath),
                requestedOutputPath = Normalize(request.outputPath),
                generatedAtUtc = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture)
            };
        }

        /// <summary>统一项目相对路径分隔符。</summary>
        private static string Normalize(string path)
        {
            return (path ?? string.Empty).Replace('\\', '/');
        }
    }
}
