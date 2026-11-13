using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Reflection;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

/// <summary>从锁定的官方 C# 源生成逐项静态调用包装，生成期不加载或运行官方 SDK。</summary>
internal static class Program
{
    // SDK 同时含设备、网络、文件、音视频等基础功能；只纳入已确认的渠道能力。
    private static readonly HashSet<string> WechatMethods = new(StringComparer.Ordinal)
    {
        "Login", "CheckSession", "GetAccountInfoSync", "GetUserInfo", "CreateUserInfoButton", "GetPhoneNumber", "GetSetting", "OpenSetting", "Authorize",
        "GetPrivacySetting", "OnNeedPrivacyAuthorization", "PrivacyAuthorizeResolve", "OpenPrivacyContract", "RequirePrivacyAuthorize",
        "CreateBannerAd", "CreateCustomAd", "CreateFixedBottomMiddleBannerAd", "CreateInterstitialAd", "CreateRewardedVideoAd", "GetDirectAdStatusSync", "OffDirectAdStatusChange", "OnDirectAdStatusChange", "GetShowSplashAdStatus",
        "CheckIsSupportMidasPayment", "RequestMidasFriendPayment", "RequestMidasPayment", "RequestMidasPaymentGameItem", "RequestVirtualPayment",
        "OnShareAppMessage", "OffShareTimeline", "OnShareTimeline", "OnShareMessageToFriend", "OffShareMessageToFriend", "ShareAppMessage", "ShareAppMessageToGroup", "ShareEmojiToGroup", "ShareImageToGroup", "ShareTextToGroup", "ShareVideoToGroup", "SetMessageToFriendQuery", "GetShareInfo", "HideShareMenu", "ShowShareMenu", "ShowShareImageMenu", "UpdateShareMenu", "GetGroupEnterInfo", "GetGroupMembersInfo", "SelectGroupMembers", "NotifyGroupMembers",
        "GetOpenDataContext", "GetRankManager", "GetUserInteractiveStorage", "SetUserCloudStorage", "RemoveUserCloudStorage", "OnInteractiveStorageModified", "OffInteractiveStorageModified",
        "OnHide", "OffHide", "OnShow", "OffShow", "GetEnterOptionsSync", "GetLaunchOptionsSync", "OnLaunchProgress", "GetLaunchOperaHandler", "ExitMiniProgram", "RestartMiniProgram",
        "SetHandoffQuery", "AuthPrivateMessage", "OffAddToFavorites", "OffCopyUrl", "OffHandoff", "OnAddToFavorites", "OnCopyUrl", "OnHandoff",
        "CreateFeedbackButton", "CreateGameClubButton", "CreatePageManager", "AddCard", "OpenCard", "CheckIsAddedToMyMiniProgram", "CheckIsSupportFacialRecognition", "GetChannelsLiveInfo", "GetChannelsLiveNoticeInfo", "GetGameClubData", "GetWeRunData", "OnMessage", "OpenChannelsActivity", "OpenChannelsEvent", "OpenChannelsLive", "OpenChannelsUserProfile", "OpenCustomerServiceChat", "OpenCustomerServiceConversation", "RequestFacialRecognition", "RequestFacialVerify", "RequestSubscribeMessage", "RequestSubscribeSystemMessage", "ReserveChannelsLive",
        "GetExptInfoSync", "GetGameExptInfo", "ReportEvent", "ReportMonitor", "ReportScene", "ReportUserBehaviorBranchAnalytics",
        "EnterChatToolMode", "ExitChatTool", "GetChatToolInfo", "IsChatTool", "OpenChatTool"
    };
    /// <summary>把需要继续调用渠道方法的 SDK 返回对象转为具名能力包装。</summary>
    private static readonly Dictionary<string, string> WechatObjects = new(StringComparer.Ordinal)
    {
        ["WXBannerAd"] = "WechatBannerAd", ["WXCustomAd"] = "WechatCustomAd",
        ["WXInterstitialAd"] = "WechatInterstitialAd", ["WXRewardedVideoAd"] = "WechatRewardedVideoAd",
        ["WXOpenDataContext"] = "WechatOpenDataContext", ["WXRankManager"] = "WechatRankManager",
        ["WXUserInfoButton"] = "WechatUserInfoButton", ["WXFeedbackButton"] = "WechatFeedbackButton",
        ["WXGameClubButton"] = "WechatGameClubButton", ["WXPageManager"] = "WechatPageManager",
        ["WXLaunchOpera"] = "WechatLaunchOpera"
    };
    /// <summary>官方小游戏 TS 候选清单中未出现在该 Unity 快照 WX 根类型的方法。</summary>
    private static readonly string[] UnitySnapshotRootAbsences =
    {
        "CheckHandoffEnabled", "OffAddToSchedule", "OffShareAppMessage", "OnAddToSchedule", "StartHandoff",
        "CreateOpenSettingButton", "CreateStoreGift", "GetFriendCloudStorage", "GetFriendSendGiftStatus", "GetGroupCloudStorage", "GetGroupInfo", "GetPotentialFriendList", "GetRelationFriendList", "GetUserCloudStorage", "GetUserCloudStorageKeys", "ModifyFriendInteractiveStorage", "SendGiftToFriend", "ShareMessageToFriend", "CreateAdSkipCard", "CreateGridAd", "GetGameLogManager", "GetScenePerformanceManager"
    };

    /// <summary>读取来源文件及输出位置，逐个渠道生成方法并导出覆盖清单。</summary>
    private static int Main(string[] args)
    {
        if (args.Length != 4)
        {
            Console.Error.WriteLine("用法：UnitySdkBindings <微信源码目录> <CrazyGames源码目录> <输出目录> <来源标识>");
            return 2;
        }
        try
        {
            string wxRoot = Path.GetFullPath(args[0]);
            string crazyRoot = Path.GetFullPath(args[1]);
            string output = Path.GetFullPath(args[2]);
            string[] wxFiles = { Path.Combine(wxRoot, "WXBase.cs"), Path.Combine(wxRoot, "WX.cs") };
            string[] moduleNames = { "Ad", "Analytics", "Banner", "Data", "Game", "Store", "User" };
            string[] crazyFiles = new[] { Path.Combine(crazyRoot, "CrazySDK.cs") }
                .Concat(moduleNames.Select(name => Path.Combine(crazyRoot, "Modules", name + "Module.cs"))).ToArray();
            string wxRuntime = Path.Combine(wxRoot, "Plugins", "wx-runtime.dll");
            if (!File.Exists(wxRuntime)) wxRuntime = Path.Combine(wxRoot, "wx-runtime.dll");
            var sources = wxFiles.Concat(new[] { wxRuntime }).Concat(crazyFiles).Select(path => new
            {
                name = Path.GetFileName(path),
                sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant()
            }).ToArray();

            var wxClasses = wxFiles.SelectMany(path => Classes(path, "WeChatWASM"))
                .Where(node => node.Identifier.Text is "WX" or "WXBase").ToArray();
            var generated = new List<object>();
            // 在写入任何生成文件之前核对官方对象能力，避免版本不匹配时留下半套绑定。
            var objects = VerifyWechatObjects(wxRuntime, Path.Combine(output, "..", "WechatPlatformObjects.cs"));
            var wxMembers = PublicMethods(wxClasses, onlyStatic: true).Where(method => WechatMethods.Contains(method.Identifier.Text)).ToArray();
            var missing = WechatMethods.Except(wxMembers.Select(method => method.Identifier.Text)).ToArray();
            if (missing.Length > 0) throw new InvalidOperationException("微信官方源码缺少已登记的方法：" + string.Join(", ", missing));
            GenerateClass(output, "WechatMinigameSdk", "APP_CREATOR_WECHAT_SDK", "global::WeChatWASM.WX", wxMembers);
            generated.Add(new { channel = "wechat", sourceType = "WeChatWASM.WX/WXBase", methods = wxMembers.Select(Signature).ToArray(), managed = new[] { "InitSDK" } });

            var rootClass = Classes(crazyFiles[0], "CrazyGames").Single(node => node.Identifier.Text == "CrazySDK");
            var rootMethods = Array.Empty<MethodDeclarationSyntax>();
            var rootProperties = PublicProperties(rootClass).Where(property => property.Modifiers.Any(SyntaxKind.StaticKeyword) && (property.Identifier.Text is "IsInitialized" or "IsShutDown" or "IsAvailable" or "Environment")).ToArray();
            GenerateClass(output, "CrazyGamesSdk", "APP_CREATOR_CRAZYGAMES_SDK", "global::CrazyGames.CrazySDK", rootMethods, rootProperties, moduleNames);
            generated.Add(new { channel = "crazygames", sourceType = "CrazyGames.CrazySDK", methods = rootMethods.Select(Signature).ToArray(), properties = rootProperties.Select(property => property.Identifier.Text).ToArray(), managed = new[] { "Init", "InitAsync" } });
            foreach (string name in moduleNames)
            {
                var moduleClass = Classes(Path.Combine(crazyRoot, "Modules", name + "Module.cs"), "CrazyGames")
                    .Single(node => node.Identifier.Text == name + "Module");
                // 模块的 Init 由厂商根 SDK 自己调用；包装层不能建立第二条初始化路径。
                var methods = PublicMethods(new[] { moduleClass }, onlyStatic: false).Where(method => method.Identifier.Text != "Init" && method.Identifier.Text != "CopyToClipboard" && !method.Identifier.Text.StartsWith("JSLibCallback_", StringComparison.Ordinal)).ToArray();
                // SystemInfo 属于宿主/设备基础信息，不随渠道开放接口对业务提供。
                var properties = PublicProperties(moduleClass).Where(property => property.Identifier.Text != "SystemInfo").ToArray();
                GenerateClass(output, "CrazyGames" + name + "Sdk", "APP_CREATOR_CRAZYGAMES_SDK", "global::CrazyGames.CrazySDK." + name, methods, properties);
                generated.Add(new { channel = "crazygames", sourceType = "CrazyGames." + name + "Module", methods = methods.Select(Signature).ToArray(), properties = properties.Select(property => property.Identifier.Text).ToArray(), managed = new[] { "Init" } });
            }
            var manifest = new { source = args[3], sources, generated, objects, unityRootDifferences = new { reason = "以下微信小游戏 JS 候选接口未出现在本快照 WX/WXBase 根类型；是否可从开放数据域或未来 SDK 获取须另行核实，不能伪造实现。", methods = UnitySnapshotRootAbsences } };
            // 仓库按原始字节保存文件，显式统一换行，避免 Windows 生成清单出现行尾差异。
            File.WriteAllText(Path.Combine(output, "sdk-bindings-manifest.json"), JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }).Replace("\r\n", "\n") + "\n");
            Console.WriteLine("已生成 " + generated.Count + " 个具名能力模块。");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }

    /// <summary>只枚举目标命名空间内的顶层类，使用明确的官方条件编译符号解析源码。</summary>
    private static IEnumerable<ClassDeclarationSyntax> Classes(string path, string sdkNamespace)
    {
        var options = new CSharpParseOptions(preprocessorSymbols: new[] { "UNITY_WEBGL", "WEIXINMINIGAME", "UNITY_EDITOR", "APP_CREATOR_WECHAT_SDK", "APP_CREATOR_CRAZYGAMES_SDK" });
        var tree = CSharpSyntaxTree.ParseText(File.ReadAllText(path), options);
        var root = tree.GetCompilationUnitRoot();
        foreach (var item in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
        {
            var ns = item.Ancestors().OfType<BaseNamespaceDeclarationSyntax>().FirstOrDefault()?.Name.ToString();
            if (ns == sdkNamespace && !item.Ancestors().OfType<ClassDeclarationSyntax>().Any()) yield return item;
        }
    }

    /// <summary>提取官方类公开的自有方法，去除继承重复签名；不混入 MonoBehaviour 接口。</summary>
    private static IEnumerable<MethodDeclarationSyntax> PublicMethods(IEnumerable<ClassDeclarationSyntax> classes, bool onlyStatic)
    {
        return classes.SelectMany(type => type.Members.OfType<MethodDeclarationSyntax>())
            .Where(method => method.Modifiers.Any(SyntaxKind.PublicKeyword) && (!onlyStatic || method.Modifiers.Any(SyntaxKind.StaticKeyword)))
            .GroupBy(Signature).Select(group => group.Last()).OrderBy(Signature, StringComparer.Ordinal);
    }

    /// <summary>用名称、泛型参数和完整形参生成可复核的方法身份。</summary>
    private static string Signature(MethodDeclarationSyntax method) =>
        method.Identifier.Text + method.TypeParameterList?.WithoutTrivia().ToFullString() + method.ParameterList.WithoutTrivia().ToFullString();

    /// <summary>提取官方公开可读属性，不通过包装暴露私有访问器。</summary>
    private static IEnumerable<PropertyDeclarationSyntax> PublicProperties(ClassDeclarationSyntax type) =>
        type.Members.OfType<PropertyDeclarationSyntax>().Where(property => property.Modifiers.Any(SyntaxKind.PublicKeyword) &&
            (property.ExpressionBody != null || property.AccessorList?.Accessors.Any(accessor => accessor.IsKind(SyntaxKind.GetAccessorDeclaration) &&
                (!accessor.Modifiers.Any() || accessor.Modifiers.Any(SyntaxKind.PublicKeyword))) == true));

    /// <summary>逐项核对官方返回对象的方法与手写强类型包装，防止 SDK 升级后遗漏公开能力。</summary>
    private static object[] VerifyWechatObjects(string runtimePath, string wrappersPath)
    {
        var assembly = Assembly.LoadFrom(Path.GetFullPath(runtimePath));
        var wrappers = Classes(wrappersPath, "AppCreator.ChannelSdk").ToDictionary(type => type.Identifier.Text, StringComparer.Ordinal);
        var mapped = WechatObjects.Concat(new[] { new KeyValuePair<string, string>("WXBaseAd", "WechatAd") });
        var result = new List<object>();
        foreach (var entry in mapped)
        {
            Type sdkType = assembly.GetType("WeChatWASM." + entry.Key, throwOnError: true)!;
            if (!wrappers.TryGetValue(entry.Value, out var wrapper)) throw new InvalidOperationException("缺少返回对象包装：" + entry.Value);
            var sdkMethods = sdkType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(method => !method.IsSpecialName && !method.Name.StartsWith("_", StringComparison.Ordinal) && !method.Name.EndsWith("Callback", StringComparison.Ordinal)).ToArray();
            var facadeMethods = wrapper.Members.OfType<MethodDeclarationSyntax>().Where(method => method.Modifiers.Any(SyntaxKind.PublicKeyword)).ToArray();
            foreach (var group in sdkMethods.GroupBy(method => method.Name, StringComparer.OrdinalIgnoreCase))
            {
                int actual = facadeMethods.Count(method => string.Equals(method.Identifier.Text, group.Key, StringComparison.OrdinalIgnoreCase));
                if (actual < group.Count()) throw new InvalidOperationException("返回对象缺少公开方法或重载：" + entry.Key + "." + group.Key);
            }
            result.Add(new { sourceType = sdkType.FullName, wrapper = entry.Value, methods = sdkMethods.Select(method => method.Name).ToArray() });
        }
        return result.ToArray();
    }

    /// <summary>生成与官方类型一致的具体方法；每次调用前核对渠道生命周期。</summary>
    private static void GenerateClass(string output, string name, string symbol, string target, IEnumerable<MethodDeclarationSyntax> methods, IEnumerable<PropertyDeclarationSyntax>? properties = null, string[]? moduleNames = null)
    {
        Directory.CreateDirectory(output);
        var builder = new StringBuilder();
        builder.AppendLine("// 此文件由 UnitySdkBindings 根据官方 SDK 源生成；不要手工修改。");
        builder.AppendLine("#if " + symbol);
        builder.AppendLine("using System;");
        builder.AppendLine("using System.Collections;");
        builder.AppendLine("using System.Collections.Generic;");
        builder.AppendLine("using System.Threading.Tasks;");
        builder.AppendLine("using UnityEngine;");
        builder.AppendLine(symbol == "APP_CREATOR_WECHAT_SDK" ? "using WeChatWASM;" : "using CrazyGames;");
        builder.AppendLine("namespace AppCreator.ChannelSdk");
        builder.AppendLine("{");
        builder.AppendLine("    /// <summary>逐项封装 " + target + " 的官方公开方法。</summary>");
        builder.AppendLine("    public sealed partial class " + name);
        builder.AppendLine("    {");
        builder.AppendLine("        private readonly Action ensureReady;");
        builder.AppendLine("        /// <summary>绑定渠道就绪检查，构造时不启动 SDK。</summary>");
        builder.AppendLine("        internal " + name + "(Action ensureReady) { this.ensureReady = ensureReady; }");
        if (moduleNames != null) foreach (string module in moduleNames)
        {
            builder.AppendLine("        /// <summary>取得 " + module + " 渠道能力。</summary>");
            builder.AppendLine("        public CrazyGames" + module + "Sdk " + module + " { get { ensureReady(); return new CrazyGames" + module + "Sdk(ensureReady); } }");
        }
        if (moduleNames != null)
        {
            builder.AppendLine("        /// <summary>读取当前官方 SDK 版本。</summary>");
            builder.AppendLine("        public string Version { get { ensureReady(); return global::CrazyGames.CrazySDK.Version; } }");
        }
        if (name == "CrazyGamesStoreSdk")
        {
            builder.AppendLine("        /// <summary>读取官方商品目录的单页上限。</summary>");
            builder.AppendLine("        public int MaxCatalogLimit { get { ensureReady(); return global::CrazyGames.StoreModule.MaxCatalogLimit; } }");
        }
        foreach (var property in properties ?? Array.Empty<PropertyDeclarationSyntax>())
        {
            var setter = property.AccessorList?.Accessors.FirstOrDefault(accessor => accessor.IsKind(SyntaxKind.SetAccessorDeclaration));
            bool canSet = setter != null && (!setter.Modifiers.Any() || setter.Modifiers.Any(SyntaxKind.PublicKeyword));
            string propertyName = property.Identifier.Text;
            builder.AppendLine("        /// <summary>读取官方渠道属性 " + propertyName + "。</summary>");
            builder.Append("        public ").Append(property.Type.WithoutTrivia().ToFullString()).Append(' ').Append(propertyName).Append(" { get { ensureReady(); return ").Append(target).Append('.').Append(propertyName).Append("; }");
            if (canSet) builder.Append(" set { ensureReady(); ").Append(target).Append('.').Append(propertyName).Append(" = value; }");
            builder.AppendLine(" }");
        }
        foreach (var method in methods)
        {
            string returnType = method.ReturnType.WithoutTrivia().ToFullString();
            string typeParameters = method.TypeParameterList?.WithoutTrivia().ToFullString() ?? "";
            string constraints = string.Join(" ", method.ConstraintClauses.Select(clause => clause.WithoutTrivia().NormalizeWhitespace().ToFullString()));
            string parameters = method.ParameterList.WithoutTrivia().NormalizeWhitespace().ToFullString();
            string arguments = string.Join(", ", method.ParameterList.Parameters.Select(parameter =>
            {
                string modifier = parameter.Modifiers.Any(SyntaxKind.RefKeyword) ? "ref " :
                    parameter.Modifiers.Any(SyntaxKind.OutKeyword) ? "out " :
                    parameter.Modifiers.Any(SyntaxKind.InKeyword) ? "in " : "";
                return modifier + parameter.Identifier.Text;
            }));
            string call = target + "." + method.Identifier.Text + typeParameters + "(" + arguments + ")";
            string? wrapper = null;
            bool wrappedObject = symbol == "APP_CREATOR_WECHAT_SDK" && WechatObjects.TryGetValue(returnType, out wrapper);
            string publicReturnType = wrappedObject ? wrapper! : returnType;
            builder.AppendLine("        /// <summary>调用官方 " + method.Identifier.Text + "，保留其原始参数、返回和回调语义。</summary>");
            builder.Append("        public ").Append(publicReturnType).Append(' ').Append(method.Identifier.Text).Append(typeParameters).Append(parameters);
            if (constraints.Length > 0) builder.Append(' ').Append(constraints);
            builder.Append(" { ensureReady(); ");
            if (wrappedObject) builder.Append("var value = ").Append(call).Append("; return value == null ? null : new ").Append(wrapper).AppendLine("(value, ensureReady); }");
            else
            {
                if (returnType != "void") builder.Append("return ");
                builder.Append(call).AppendLine("; }");
            }
        }
        builder.AppendLine("    }");
        builder.AppendLine("}");
        builder.AppendLine("#endif");
        File.WriteAllText(Path.Combine(output, name + ".g.cs"), builder.ToString().Replace("\r\n", "\n"), new UTF8Encoding(false));
    }
}
