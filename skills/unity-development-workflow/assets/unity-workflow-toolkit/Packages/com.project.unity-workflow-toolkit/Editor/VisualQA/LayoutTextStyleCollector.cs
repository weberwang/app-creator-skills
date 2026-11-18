using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

namespace Project.UnityWorkflow.VisualQA
{
    /// <summary>声明项目实际安装的文字组件及其可读取的序列化属性。</summary>
    [Serializable]
    public sealed class LayoutTextStyleProbe
    {
        public string name = string.Empty;
        public string componentType = string.Empty;
        public string propertyPath = string.Empty;
    }

    /// <summary>记录当前场景文字组件的一项实际属性。</summary>
    [Serializable]
    public sealed class LayoutTextStyleObservation
    {
        public string name = string.Empty;
        public string componentType = string.Empty;
        public string propertyPath = string.Empty;
        public string status = "UNAVAILABLE";
        public string actualValue = string.Empty;
    }

    /// <summary>按项目确认的路径读取实际组件，避免假设 UniText 版本接口。</summary>
    internal static class LayoutTextStyleCollector
    {
        /// <summary>目标组件或属性不可用时记录未验证，不用默认值替代。</summary>
        public static List<LayoutTextStyleObservation> Capture(GameObject target, List<LayoutTextStyleProbe> probes)
        {
            var result = new List<LayoutTextStyleObservation>();
            if (target == null || probes == null) return result;
            Component[] components = target.GetComponents<Component>();
            foreach (LayoutTextStyleProbe probe in probes)
            {
                if (probe == null) continue;
                var observation = new LayoutTextStyleObservation
                {
                    name = probe.name,
                    componentType = probe.componentType,
                    propertyPath = probe.propertyPath
                };
                Component matched = null;
                int count = 0;
                foreach (Component component in components)
                {
                    if (component == null || component.GetType().FullName != probe.componentType) continue;
                    matched = component;
                    count++;
                }
                if (count == 1 && !string.IsNullOrWhiteSpace(probe.propertyPath))
                {
                    using (var serialized = new SerializedObject(matched))
                    {
                        SerializedProperty property = serialized.FindProperty(probe.propertyPath);
                        if (TryRead(property, out string value))
                        {
                            observation.status = "MEASURED";
                            observation.actualValue = value;
                        }
                    }
                }
                result.Add(observation);
            }
            return result;
        }

        /// <summary>从当前 Panel 的元素和解析样式读取项目指定的公开属性。</summary>
        public static List<LayoutTextStyleObservation> CaptureUiToolkit(VisualElement element, List<LayoutTextStyleProbe> probes)
        {
            var result = new List<LayoutTextStyleObservation>();
            if (element == null || probes == null) return result;
            foreach (LayoutTextStyleProbe probe in probes)
            {
                if (probe == null) continue;
                var observation = new LayoutTextStyleObservation
                {
                    name = probe.name,
                    componentType = probe.componentType,
                    propertyPath = probe.propertyPath
                };
                const string prefix = "resolvedStyle.";
                if (element.GetType().FullName == probe.componentType && probe.propertyPath != null
                    && probe.propertyPath.StartsWith(prefix, StringComparison.Ordinal))
                {
                    // 只使用当前 Unity 版本实际提供的解析属性，不以推测的插件字段填补缺失。
                    var property = typeof(IResolvedStyle).GetProperty(probe.propertyPath.Substring(prefix.Length));
                    try
                    {
                        if (property != null && TryConvert(property.GetValue(element.resolvedStyle), out string value))
                        {
                            observation.status = "MEASURED";
                            observation.actualValue = value;
                        }
                    }
                    catch (System.Reflection.TargetInvocationException)
                    {
                        // 属性无法读取时保留 UNAVAILABLE，由验证器报告未验证。
                    }
                }
                result.Add(observation);
            }
            return result;
        }

        /// <summary>将解析样式转换为与组件采集一致的稳定表示。</summary>
        private static bool TryConvert(object input, out string value)
        {
            value = string.Empty;
            if (input is float number) value = number.ToString("R", CultureInfo.InvariantCulture);
            else if (input is int integer) value = integer.ToString(CultureInfo.InvariantCulture);
            else if (input is bool boolean) value = boolean ? "true" : "false";
            else if (input is string text) value = text;
            else if (input is Color color) value = "#" + ColorUtility.ToHtmlStringRGBA(color);
            else if (input is Enum enumeration) value = Convert.ToInt64(enumeration, CultureInfo.InvariantCulture).ToString(CultureInfo.InvariantCulture);
            else if (input is UnityEngine.Object asset) value = AssetDatabase.GetAssetPath(asset);
            else if (input != null && input.GetType().FullName == "UnityEngine.UIElements.FontDefinition")
            {
                // FontDefinition 可能引用 Font 或 FontAsset，按实际设置读取真实资源。
                var fontProperty = input.GetType().GetProperty("font");
                var assetProperty = input.GetType().GetProperty("fontAsset");
                var font = fontProperty?.GetValue(input) as UnityEngine.Object;
                var fontAsset = assetProperty?.GetValue(input) as UnityEngine.Object;
                value = AssetDatabase.GetAssetPath(font != null ? font : fontAsset);
            }
            else return false;
            return !string.IsNullOrEmpty(value);
        }

        /// <summary>只读取可稳定表示的属性，资源使用真实 AssetDatabase 路径。</summary>
        private static bool TryRead(SerializedProperty property, out string value)
        {
            value = string.Empty;
            if (property == null) return false;
            switch (property.propertyType)
            {
                case SerializedPropertyType.Integer:
                case SerializedPropertyType.Enum:
                    value = property.intValue.ToString(CultureInfo.InvariantCulture);
                    return true;
                case SerializedPropertyType.Float:
                    value = property.floatValue.ToString("R", CultureInfo.InvariantCulture);
                    return true;
                case SerializedPropertyType.Boolean:
                    value = property.boolValue ? "true" : "false";
                    return true;
                case SerializedPropertyType.String:
                    value = property.stringValue;
                    return value != null;
                case SerializedPropertyType.Color:
                    value = "#" + ColorUtility.ToHtmlStringRGBA(property.colorValue);
                    return true;
                case SerializedPropertyType.ObjectReference:
                    value = AssetDatabase.GetAssetPath(property.objectReferenceValue);
                    return !string.IsNullOrWhiteSpace(value);
                default:
                    return false;
            }
        }
    }
}
