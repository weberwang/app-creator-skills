using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
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
                if (count == 1 && !string.IsNullOrWhiteSpace(probe.propertyPath)
                    && TryReadComponent(matched, probe, out string value))
                {
                    observation.status = "MEASURED";
                    observation.actualValue = value;
                }
                result.Add(observation);
            }
            return result;
        }

        /// <summary>文字效果可从实际参与渲染的材质读取，组件字段仍使用现有序列化路径。</summary>
        private static bool TryReadComponent(Component component, LayoutTextStyleProbe probe, out string value)
        {
            string path = probe.propertyPath;
            if (probe.name == "visible" && path == "visible")
            {
                return TryReadComponentVisibility(component, out value);
            }
            if (probe.name == "content" || !path.StartsWith("material.", StringComparison.Ordinal))
            {
                using (var serialized = new SerializedObject(component))
                {
                    // 内容只接受真实文字字段，字号等数值属性不能充当文字证据。
                    var property = serialized.FindProperty(path);
                    value = string.Empty;
                    return (probe.name != "content" || property?.propertyType == SerializedPropertyType.String)
                        && TryRead(property, out value);
                }
            }

            value = string.Empty;
            string[] parts = path.Split('.');
            if (parts.Length != 3 || string.IsNullOrWhiteSpace(parts[2])) return false;
            Material material = null;
            if (component is Graphic graphic) material = graphic.materialForRendering;
            // 存在 PropertyBlock 时共用材质值可能被覆盖，交给项目原生探针进一步回读。
            else if (component is Renderer renderer && !renderer.HasPropertyBlock()) material = renderer.sharedMaterial;
            if (material == null || !material.HasProperty(parts[2])) return false;
            if (parts[1] == "color") value = "#" + ColorUtility.ToHtmlStringRGBA(material.GetColor(parts[2]));
            else if (parts[1] == "float") value = material.GetFloat(parts[2]).ToString("R", CultureInfo.InvariantCulture);
            return !string.IsNullOrEmpty(value);
        }

        /// <summary>读取实际绘制组件的启用、剔除和整体透明状态。</summary>
        private static bool TryReadComponentVisibility(Component component, out string value)
        {
            value = string.Empty;
            bool visible;
            if (component is Graphic graphic)
            {
                // 字体色可以透明并保留描边，只检查影响整层绘制的透明度。
                CanvasRenderer canvas = graphic.canvasRenderer;
                visible = graphic.isActiveAndEnabled && canvas != null && !canvas.cull
                    && canvas.GetAlpha() > 0f && canvas.GetInheritedAlpha() > 0f;
            }
            else
            {
                Renderer renderer = component as Renderer ?? component.GetComponent<Renderer>();
                if (renderer == null) return false;
                visible = renderer.gameObject.activeInHierarchy && renderer.enabled
                    && (!(component is Behaviour behaviour) || behaviour.isActiveAndEnabled);
            }
            value = visible ? "true" : "false";
            return true;
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
                if (element.GetType().FullName == probe.componentType
                    && TryReadUiToolkit(element, probe, out string value))
                {
                    observation.status = "MEASURED";
                    observation.actualValue = value;
                }
                result.Add(observation);
            }
            return result;
        }

        /// <summary>文本和可见性取自元素本身，其他属性沿用解析样式探针。</summary>
        private static bool TryReadUiToolkit(VisualElement element, LayoutTextStyleProbe probe, out string value)
        {
            value = string.Empty;
            if (probe.name == "content")
            {
                if (probe.propertyPath != "text" || !(element is TextElement text)) return false;
                value = text.text ?? string.Empty;
                return true;
            }
            if (probe.name == "visible" && probe.propertyPath == "visible")
            {
                bool visible = element.panel != null && element.visible;
                // display 和 opacity 在祖先上生效，检查实际层级。
                for (VisualElement current = element; current != null && visible; current = current.parent)
                {
                    visible = current.resolvedStyle.display != DisplayStyle.None && current.resolvedStyle.opacity > 0f;
                }
                value = visible ? "true" : "false";
                return true;
            }
            const string prefix = "resolvedStyle.";
            if (probe.propertyPath == null || !probe.propertyPath.StartsWith(prefix, StringComparison.Ordinal)) return false;
            var property = typeof(IResolvedStyle).GetProperty(probe.propertyPath.Substring(prefix.Length));
            try
            {
                return property != null && TryConvert(property.GetValue(element.resolvedStyle), out value);
            }
            catch (System.Reflection.TargetInvocationException)
            {
                // 属性无法读取时由验证器保持未验证。
                return false;
            }
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
