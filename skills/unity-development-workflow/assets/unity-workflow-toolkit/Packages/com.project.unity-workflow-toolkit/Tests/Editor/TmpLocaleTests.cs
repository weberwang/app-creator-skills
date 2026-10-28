using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using NUnit.Framework;
using Project.UnityWorkflow.FontPipeline;
using Project.UnityWorkflow.PipelineCommands;
using Project.UnityWorkflow.Runtime;
using UnityEditor;
using UnityEngine;

namespace Project.UnityWorkflow.Tests
{
    /// <summary>覆盖字体生产与运行绑定的语言标签和默认回退边界。</summary>
    public sealed class TmpLocaleTests
    {
        /// <summary>真实资产读取检查覆盖英单语项目、所选语言遗漏和重复语言。</summary>
        [Test]
        public void ActualPlanIsComparedWithProjectLanguages()
        {
            string assetPath = AssetDatabase.GenerateUniqueAssetPath("Assets/TmpLocaleCheck.asset");
            string jsonPath = "Temp/locale-check-" + Guid.NewGuid().ToString("N") + ".json";
            var plan = ScriptableObject.CreateInstance<TmpFontAtlasPlan>();
            try
            {
                // 模拟已有英语单语项目并保存真实 ScriptableObject，命令必须从 AssetDatabase 重新读取。
                JsonUtility.FromJsonOverwrite("{\"groups\":[{\"localeCodes\":[\"en\"]}]}", plan);
                AssetDatabase.CreateAsset(plan, assetPath);
                AssetDatabase.SaveAssets();
                Directory.CreateDirectory("Temp");
                File.WriteAllText(jsonPath, "{\"languages\":[\"en\"],\"defaultLanguage\":\"en\"}");
                var notRunning = ValidateFontLocalesCommand.Execute(assetPath, jsonPath, "Artifacts/validation/locale-test.json");
                Assert.IsFalse(notRunning.Success);
                Assert.AreEqual("NOT_RUN", ((FontLocaleReport)notRunning.Data).startupDefaultStatus);
                Assert.IsTrue(ValidateFontLocalesCommand.Compare(plan, new ProjectLocales { languages = new[] { "en" }, defaultLanguage = "en" }).passed);
                File.WriteAllText(jsonPath, "{\"languages\":[\"zh-CN\",\"en\"],\"defaultLanguage\":\"zh-CN\"}");
                var failed = ValidateFontLocalesCommand.Compare(plan, new ProjectLocales { languages = new[] { "zh-CN", "en" }, defaultLanguage = "zh-CN" });
                Assert.IsFalse(failed.passed);
                CollectionAssert.Contains(failed.missing, "zh-CN");
                JsonUtility.FromJsonOverwrite("{\"groups\":[{\"localeCodes\":[\"en\",\"EN\"]}]}", plan);
                Assert.IsFalse(ValidateFontLocalesCommand.Compare(plan, new ProjectLocales { languages = new[] { "en" }, defaultLanguage = "en" }).passed);
                Assert.IsFalse(ValidateFontLocalesCommand.Execute("../outside.asset", jsonPath, "Artifacts/validation/locale-test.json").Success);
            }
            finally
            {
                AssetDatabase.DeleteAsset(assetPath);
                if (File.Exists(jsonPath)) File.Delete(jsonPath);
            }
        }

        /// <summary>额外语言和地区被保留，简体别名不覆盖繁体中文。</summary>
        [Test]
        public void BinderPreservesOptionalRegionsAndLimitsFallbacks()
        {
            var normalize = typeof(LocalizedTmpFontBinder).GetMethod("TryNormalizeLocaleCode", BindingFlags.NonPublic | BindingFlags.Static);
            var fallback = typeof(LocalizedTmpFontBinder).GetMethod("TryGetDefaultFallback", BindingFlags.NonPublic | BindingFlags.Static);
            var args = new object[] { "fr-CA", null };
            Assert.AreEqual(true, normalize.Invoke(null, args));
            Assert.AreEqual("fr-CA", args[1]);
            args = new object[] { "zh-Hant-TW", null };
            Assert.AreEqual(false, fallback.Invoke(null, args));
            args = new object[] { "zh-Hans", null };
            Assert.AreEqual(true, fallback.Invoke(null, args));
            Assert.AreEqual("zh-CN", args[1]);
            args = new object[] { "en-US", null };
            Assert.AreEqual(true, fallback.Invoke(null, args));
            Assert.AreEqual("en", args[1]);
        }

        /// <summary>选定地区使用自身字表；缺失默认表时才使用明确别名。</summary>
        [Test]
        public void GeneratorUsesExactTablesAndDefaultAliases()
        {
            var lookup = typeof(TmpFontAtlasGenerator).GetMethod("TryGetLocaleCharacters", BindingFlags.NonPublic | BindingFlags.Static);
            var tables = new Dictionary<string, SortedSet<uint>>(StringComparer.OrdinalIgnoreCase)
            {
                ["fr-CA"] = new SortedSet<uint> { 1 },
                ["fr-FR"] = new SortedSet<uint> { 2 },
                ["zh-Hans"] = new SortedSet<uint> { 3 },
                ["zh-Hant-TW"] = new SortedSet<uint> { 4 },
            };
            var args = new object[] { tables, "fr-CA", null };
            Assert.AreEqual(true, lookup.Invoke(null, args));
            CollectionAssert.AreEquivalent(new uint[] { 1 }, (SortedSet<uint>)args[2]);
            args = new object[] { tables, "zh-CN", null };
            Assert.AreEqual(true, lookup.Invoke(null, args));
            CollectionAssert.AreEquivalent(new uint[] { 3 }, (SortedSet<uint>)args[2]);
            args = new object[] { tables, "fr-BE", null };
            Assert.AreEqual(false, lookup.Invoke(null, args));
        }
    }
}
