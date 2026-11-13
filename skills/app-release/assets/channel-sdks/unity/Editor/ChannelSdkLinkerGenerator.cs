#if UNITY_EDITOR
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security;
using System.Text;
using UnityEditor;

namespace AppCreator.ChannelSdk.Editor
{
    /// <summary>为实际安装的渠道 SDK 生成独立的 IL2CPP 保留清单。</summary>
    public static class ChannelSdkLinkerGenerator
    {
        private const string Destination = "Assets/AppCreatorChannelSdkGenerated/link.xml";

        /// <summary>扫描已加载程序集中真实声明的 SDK 类型；不会覆盖已有文件。</summary>
        [MenuItem("Tools/App Creator/生成渠道 SDK 保留清单")]
        public static void Generate()
        {
            if (File.Exists(Destination)) throw new InvalidOperationException("目标 link.xml 已存在，请先人工核对：" + Destination);
            string[] assemblies = AppDomain.CurrentDomain.GetAssemblies().Where(ContainsSdkTypes)
                .Select(assembly => assembly.GetName().Name).Distinct().OrderBy(name => name, StringComparer.Ordinal).ToArray();
            if (assemblies.Length == 0) throw new InvalidOperationException("未发现已安装的微信或 CrazyGames 官方 SDK 类型。");
            var content = new StringBuilder("<linker>\n");
            // 渠道 API 动态调用需要保留具体实现；同程序集其他类型也会被保留，应评估包体影响。
            foreach (string name in assemblies)
                content.Append("  <assembly fullname=\"").Append(SecurityElement.Escape(name)).Append("\" preserve=\"all\"/>\n");
            content.Append("</linker>\n");
            Directory.CreateDirectory(Path.GetDirectoryName(Destination));
            File.WriteAllText(Destination, content.ToString(), new UTF8Encoding(false));
            AssetDatabase.Refresh();
        }

        /// <summary>只选择实际包含官方命名空间类型的程序集，不猜测程序集名称。</summary>
        private static bool ContainsSdkTypes(Assembly assembly)
        {
            Type[] types;
            try { types = assembly.GetTypes(); }
            catch (ReflectionTypeLoadException error) { types = error.Types.Where(type => type != null).ToArray(); }
            return types.Any(type => type.Namespace == "WeChatWASM" || (type.Namespace != null && type.Namespace.StartsWith("WeChatWASM.", StringComparison.Ordinal)) ||
                type.Namespace == "CrazyGames" || (type.Namespace != null && type.Namespace.StartsWith("CrazyGames.", StringComparison.Ordinal)));
        }
    }
}
#endif
