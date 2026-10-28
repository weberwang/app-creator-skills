using System;
using UnityEngine;
using UnityEngine.Localization.Settings;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace Project.UnityWorkflow.Runtime
{
    /// <summary>运行中实际捕获的本地化初始化后首个语言与运行身份。</summary>
    public sealed class StartupLocaleSnapshot
    {
        /// <summary>本次启动的唯一标识。</summary>
        public string RunId { get; internal set; }
        /// <summary>应用标识。</summary>
        public string ApplicationId { get; internal set; }
        /// <summary>应用名称。</summary>
        public string ProductName { get; internal set; }
        /// <summary>初始化后选择的语言。</summary>
        public string Locale { get; internal set; }
        /// <summary>实际捕获的 UTC 时间。</summary>
        public string CapturedAtUtc { get; internal set; }
        /// <summary>捕获时运行帧序号。</summary>
        public int Frame { get; internal set; }
    }

    /// <summary>仅在真实运行时记录 Localization 初始化结束后的首次语言。</summary>
    public static class StartupLocaleObservation
    {
        private static string activeRunId;

        /// <summary>当前运行的真实观察；初始化未完成或失败时为空。</summary>
        public static StartupLocaleSnapshot Current { get; private set; }

        /// <summary>每次运行清除旧快照，即使 Editor 禁用域重载也不能沿用上次结果。</summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void Reset()
        {
            activeRunId = Guid.NewGuid().ToString("N");
            Current = null;
        }

        /// <summary>观察项目已启动且尚未完成的 Localization 初始化，不主动启动初始化。</summary>
        /// <param name="initialization">项目从 LocalizationSettings.InitializationOperation 取得的实际初始化操作。</param>
        /// <returns>成功绑定观察时为 true；初始化已完成或无效时不补造证据。</returns>
        public static bool Observe(AsyncOperationHandle<LocalizationSettings> initialization)
        {
            if (!Application.isPlaying || string.IsNullOrEmpty(activeRunId) || !initialization.IsValid() || initialization.IsDone || Current != null) return false;
            string runId = activeRunId;
            // 只监听调用者已取得的操作；迟到的旧回调不能覆盖新启动的证据。
            initialization.Completed += operation =>
            {
                if (!Application.isPlaying || activeRunId != runId || Current != null || operation.Status != AsyncOperationStatus.Succeeded) return;
                var locale = LocalizationSettings.SelectedLocale;
                if (locale == null || string.IsNullOrWhiteSpace(locale.Identifier.Code)) return;
                Current = new StartupLocaleSnapshot {
                    RunId = runId, ApplicationId = Application.identifier, ProductName = Application.productName,
                    Locale = locale.Identifier.Code, CapturedAtUtc = DateTime.UtcNow.ToString("O"), Frame = Time.frameCount,
                };
            };
            return true;
        }
    }
}
