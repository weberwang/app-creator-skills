using System;
using System.Collections.Generic;
using System.Reflection;
using NUnit.Framework;
using Project.UnityWorkflow.VisualQA;
using UnityEngine;
using UnityEngine.UI;

namespace Project.UnityWorkflow.Tests.Editor
{
    /// <summary>验证文字快照来自实际场景组件，缺少属性时保留未验证。</summary>
    public sealed class LayoutTextStyleCollectorTests
    {
        /// <summary>同一组件的字号、实际内容和禁用状态必须反映到新快照。</summary>
        [Test]
        public void CaptureReadsActualSerializedComponentAndRejectsMissingProperty()
        {
            var target = new GameObject("Text", typeof(RectTransform), typeof(Text));
            try
            {
                Text text = target.GetComponent<Text>();
                text.fontSize = 24;
                text.text = "+50";
                var probes = new List<LayoutTextStyleProbe>
                {
                    new LayoutTextStyleProbe { name = "fontSize", componentType = typeof(Text).FullName, propertyPath = "m_FontData.m_FontSize" },
                    new LayoutTextStyleProbe { name = "missing", componentType = typeof(Text).FullName, propertyPath = "missing" },
                    new LayoutTextStyleProbe { name = "content", componentType = typeof(Text).FullName, propertyPath = "m_Text" },
                    new LayoutTextStyleProbe { name = "visible", componentType = typeof(Text).FullName, propertyPath = "visible" }
                };
                Type collector = typeof(LayoutMeasurementRequest).Assembly.GetType("Project.UnityWorkflow.VisualQA.LayoutTextStyleCollector", true);
                MethodInfo capture = collector.GetMethod("Capture", BindingFlags.Public | BindingFlags.Static);
                var observed = (List<LayoutTextStyleObservation>)capture.Invoke(null, new object[] { target, probes });
                Assert.That(observed[0].status, Is.EqualTo("MEASURED"));
                Assert.That(observed[0].actualValue, Is.EqualTo("24"));
                Assert.That(observed[1].status, Is.EqualTo("UNAVAILABLE"));
                Assert.That(observed[2].status, Is.EqualTo("MEASURED"));
                Assert.That(observed[2].actualValue, Is.EqualTo("+50"));

                text.fontSize = 32;
                text.text = string.Empty;
                text.enabled = false;
                observed = (List<LayoutTextStyleObservation>)capture.Invoke(null, new object[] { target, probes });
                Assert.That(observed[0].actualValue, Is.EqualTo("32"));
                Assert.That(observed[2].status, Is.EqualTo("MEASURED"));
                Assert.That(observed[2].actualValue, Is.Empty);
                Assert.That(observed[3].status, Is.EqualTo("MEASURED"));
                Assert.That(observed[3].actualValue, Is.EqualTo("false"));
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(target);
            }
        }
    }
}
