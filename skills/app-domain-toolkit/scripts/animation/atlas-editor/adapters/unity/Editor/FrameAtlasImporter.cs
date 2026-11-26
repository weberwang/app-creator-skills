using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.U2D.Sprites;
using UnityEngine;

namespace FrameAtlas
{
    /// <summary>图集清单中的二维坐标。</summary>
    [Serializable] internal sealed class AtlasPoint { public float x; public float y; }
    /// <summary>图集清单中的矩形与尺寸。</summary>
    [Serializable] internal sealed class AtlasRect { public float x; public float y; public int width; public int height; }
    /// <summary>一张实际输出的 PNG 图集页。</summary>
    [Serializable] internal sealed class AtlasPage { public string file; public int width; public int height; }
    /// <summary>已裁剪帧的排版、位置和播放时间。</summary>
    [Serializable] internal sealed class AtlasFrame
    {
        public string id;
        public int page;
        public AtlasRect rect;
        public AtlasRect trimRect;
        public AtlasPoint offset;
        public int packingRotation;
        public float durationMs;
    }
    /// <summary>帧动画导出清单。</summary>
    [Serializable] internal sealed class AtlasManifest
    {
        public string schema;
        public string name;
        public string target;
        public float fps;
        public bool loop;
        public AtlasPoint anchor;
        public AtlasPage[] pages;
        public AtlasFrame[] frames;
    }

    /// <summary>将导出的图集切片并生成 Unity 原生动画资产。</summary>
    internal static class FrameAtlasImporter
    {
        private const float PixelsPerUnit = 100f;
        private const string OutputFolder = "FrameAtlasGenerated";

        /// <summary>为选中的 animation.json 提供导入入口。</summary>
        [MenuItem("Assets/Frame Atlas/导入帧动画", false, 2200)]
        private static void ImportSelected()
        {
            try
            {
                string path = AssetDatabase.GetAssetPath(Selection.activeObject);
                Import(path);
            }
            catch (Exception error)
            {
                Debug.LogError("帧图集导入失败：" + error.Message);
            }
        }

        /// <summary>仅在选中导出清单时显示可执行菜单。</summary>
        [MenuItem("Assets/Frame Atlas/导入帧动画", true)]
        private static bool CanImportSelected()
        {
            return Path.GetFileName(AssetDatabase.GetAssetPath(Selection.activeObject)) == "animation.json";
        }

        /// <summary>预检清单后生成图集切片、动画、控制器和示例 Prefab。</summary>
        internal static void Import(string manifestPath)
        {
            if (!manifestPath.StartsWith("Assets/", StringComparison.Ordinal) ||
                Path.GetFileName(manifestPath) != "animation.json")
                throw new InvalidOperationException("请选择 Assets 内的 animation.json。");

            AtlasManifest manifest = JsonUtility.FromJson<AtlasManifest>(File.ReadAllText(manifestPath));
            string directory = Path.GetDirectoryName(manifestPath).Replace('\\', '/');
            Validate(manifest, directory);
            string output = directory + "/" + OutputFolder;
            if (!AssetDatabase.IsValidFolder(output))
                AssetDatabase.CreateFolder(directory, OutputFolder);

            var sprites = new Dictionary<string, Sprite>();
            for (int page = 0; page < manifest.pages.Length; page++)
                ImportPage(directory, manifest, page, sprites);

            AnimationClip clip = CreateClip(output, manifest, sprites);
            AnimatorController controller = CreateController(output, clip);
            CreatePrefab(output, controller, sprites[manifest.frames[0].id]);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("帧图集导入完成：" + output);
        }

        /// <summary>拒绝错误的目标、路径、范围与无法表达为现有合同帧网格的时间。</summary>
        private static void Validate(AtlasManifest manifest, string directory)
        {
            if (manifest == null || manifest.schema != "frame-atlas/1" || manifest.target != "unity" ||
                manifest.anchor == null || !Finite(manifest.anchor.x) || !Finite(manifest.anchor.y) ||
                !Finite(manifest.fps) || manifest.fps <= 0 || manifest.fps > 24 ||
                manifest.pages == null || manifest.pages.Length == 0 ||
                manifest.frames == null || manifest.frames.Length == 0)
                throw new InvalidOperationException("清单头、目标、锚点或帧率无效。");

            for (int index = 0; index < manifest.pages.Length; index++)
            {
                AtlasPage page = manifest.pages[index];
                if (page == null || page.file != $"atlas-{index + 1}.png" ||
                    page.width <= 0 || page.height <= 0 || page.width > 8192 || page.height > 8192 ||
                    !(AssetImporter.GetAtPath(directory + "/" + page.file) is TextureImporter))
                    throw new InvalidOperationException($"图集页 {index + 1} 不存在或格式无效。");
                byte[] header = new byte[24];
                using (var stream = File.OpenRead(directory + "/" + page.file))
                    if (stream.Read(header, 0, header.Length) != header.Length)
                        throw new InvalidOperationException($"图集页 {page.file} 不是完整 PNG。");
                byte[] signature = { 137, 80, 78, 71, 13, 10, 26, 10 };
                if (!signature.SequenceEqual(header.Take(8)) ||
                    Encoding.ASCII.GetString(header, 12, 4) != "IHDR" ||
                    BigEndianInt(header, 16) != page.width || BigEndianInt(header, 20) != page.height)
                    throw new InvalidOperationException($"图集页 {page.file} 的原始 PNG 尺寸与清单不一致。");
            }

            var ids = new HashSet<string>();
            double ticks = 0;
            foreach (AtlasFrame frame in manifest.frames)
            {
                if (frame == null || string.IsNullOrEmpty(frame.id) || !ids.Add(frame.id) ||
                    frame.page < 0 || frame.page >= manifest.pages.Length || frame.packingRotation != 0 ||
                    frame.rect == null || frame.trimRect == null || frame.offset == null ||
                    !Finite(frame.rect.x) || !Finite(frame.rect.y) || !Finite(frame.trimRect.x) ||
                    !Finite(frame.trimRect.y) || !Finite(frame.offset.x) || !Finite(frame.offset.y) ||
                    frame.rect.x < 0 || frame.rect.y < 0 || frame.rect.x != Mathf.Floor(frame.rect.x) ||
                    frame.rect.y != Mathf.Floor(frame.rect.y) || frame.rect.width <= 0 || frame.rect.height <= 0 ||
                    frame.rect.width != frame.trimRect.width || frame.rect.height != frame.trimRect.height ||
                    frame.rect.x + frame.rect.width > manifest.pages[frame.page].width ||
                    frame.rect.y + frame.rect.height > manifest.pages[frame.page].height ||
                    !Finite(frame.durationMs) || frame.durationMs <= 0)
                    throw new InvalidOperationException("帧的名称、矩形、偏移、旋转或时长无效。");
                ticks += frame.durationMs * manifest.fps / 1000.0;
                if (Math.Abs(ticks - Math.Round(ticks)) > 0.0001)
                    throw new InvalidOperationException($"帧 {frame.id} 的结束时间不在 FPS 网格上。");
            }
        }

        /// <summary>检查浮点坐标和时间。</summary>
        private static bool Finite(float value) => !float.IsNaN(value) && !float.IsInfinity(value);

        /// <summary>读取 PNG 文件头里的大端整数。</summary>
        private static int BigEndianInt(byte[] data, int offset)
        {
            return data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
        }

        /// <summary>计算确定性 Sprite 名称与标识，便于同页重复导入保持引用。</summary>
        private static string StableId(string value)
        {
            using (MD5 hash = MD5.Create())
                return string.Concat(hash.ComputeHash(Encoding.UTF8.GetBytes(value)).Select(b => b.ToString("x2")));
        }

        /// <summary>配置单页 Sprite 元数据，并重新加载实际导入的子资源。</summary>
        private static void ImportPage(string directory, AtlasManifest manifest, int pageIndex, Dictionary<string, Sprite> result)
        {
            AtlasPage page = manifest.pages[pageIndex];
            string path = directory + "/" + page.file;
            var importer = (TextureImporter)AssetImporter.GetAtPath(path);
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Multiple;
            importer.spritePixelsPerUnit = PixelsPerUnit;
            importer.npotScale = TextureImporterNPOTScale.None;
            importer.maxTextureSize = Math.Max(32, Mathf.NextPowerOfTwo(Math.Max(page.width, page.height)));
            importer.textureCompression = TextureImporterCompression.Uncompressed;
            importer.mipmapEnabled = false;
            importer.SaveAndReimport();

            var factories = new SpriteDataProviderFactories();
            factories.Init();
            var provider = factories.GetSpriteEditorDataProviderFromObject(importer);
            provider.InitSpriteEditorDataProvider();
            var spriteRects = new List<SpriteRect>();
            var nameIds = new List<SpriteNameFileIdPair>();
            foreach (AtlasFrame frame in manifest.frames.Where(item => item.page == pageIndex))
            {
                string id = StableId(frame.id);
                string name = "frame_" + id;
                var guid = new GUID(id);
                // 编辑器锚点坐标向下，而 Sprite 的枢轴从裁剪矩形左下角计算。
                float pivotX = (manifest.anchor.x - frame.trimRect.x - frame.offset.x) / frame.rect.width;
                float pivotY = 1f - (manifest.anchor.y - frame.trimRect.y - frame.offset.y) / frame.rect.height;
                spriteRects.Add(new SpriteRect
                {
                    name = name,
                    spriteID = guid,
                    rect = new Rect(frame.rect.x, page.height - frame.rect.y - frame.rect.height,
                        frame.rect.width, frame.rect.height),
                    alignment = SpriteAlignment.Custom,
                    pivot = new Vector2(pivotX, pivotY),
                });
                nameIds.Add(new SpriteNameFileIdPair(name, guid));
            }
            provider.SetSpriteRects(spriteRects.ToArray());
            provider.GetDataProvider<ISpriteNameFileIdDataProvider>().SetNameFileIdPairs(nameIds);
            provider.Apply();
            importer.SaveAndReimport();
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (texture == null || texture.width != page.width || texture.height != page.height)
                throw new InvalidOperationException($"图集页 {page.file} 导入后被缩放，请检查平台覆盖设置。");
            var actual = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Sprite>().ToDictionary(sprite => sprite.name);
            foreach (AtlasFrame frame in manifest.frames.Where(item => item.page == pageIndex))
            {
                string name = "frame_" + StableId(frame.id);
                if (!actual.TryGetValue(name, out Sprite sprite))
                    throw new InvalidOperationException("重新导入后找不到 Sprite：" + name);
                result.Add(frame.id, sprite);
            }
        }

        /// <summary>创建或更新独立 Clip，末尾重复关键帧保留最后一帧停留时间。</summary>
        private static AnimationClip CreateClip(string directory, AtlasManifest manifest, Dictionary<string, Sprite> sprites)
        {
            string path = directory + "/FrameAnimation.anim";
            AnimationClip clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(path);
            if (clip == null)
            {
                clip = new AnimationClip();
                AssetDatabase.CreateAsset(clip, path);
            }
            clip.ClearCurves();
            clip.frameRate = manifest.fps;
            var keys = new List<ObjectReferenceKeyframe>();
            double seconds = 0;
            foreach (AtlasFrame frame in manifest.frames)
            {
                keys.Add(new ObjectReferenceKeyframe { time = (float)seconds, value = sprites[frame.id] });
                seconds += frame.durationMs / 1000.0;
            }
            keys.Add(new ObjectReferenceKeyframe { time = (float)seconds, value = sprites[manifest.frames[manifest.frames.Length - 1].id] });
            AnimationUtility.SetObjectReferenceCurve(clip,
                EditorCurveBinding.PPtrCurve("", typeof(SpriteRenderer), "m_Sprite"), keys.ToArray());
            AnimationClipSettings settings = AnimationUtility.GetAnimationClipSettings(clip);
            settings.loopTime = manifest.loop;
            AnimationUtility.SetAnimationClipSettings(clip, settings);
            EditorUtility.SetDirty(clip);
            return clip;
        }

        /// <summary>创建或更新示例 Animator 的默认状态。</summary>
        private static AnimatorController CreateController(string directory, AnimationClip clip)
        {
            string path = directory + "/FrameAnimation.controller";
            AnimatorController controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(path);
            if (controller == null) controller = AnimatorController.CreateAnimatorControllerAtPath(path);
            AnimatorStateMachine stateMachine = controller.layers[0].stateMachine;
            AnimatorState state = stateMachine.states.Select(item => item.state).FirstOrDefault(item => item.name == "FrameAnimation");
            if (state == null) state = stateMachine.AddState("FrameAnimation");
            state.motion = clip;
            stateMachine.defaultState = state;
            EditorUtility.SetDirty(controller);
            return controller;
        }

        /// <summary>创建包含真实 SpriteRenderer 与 Animator 引用的可运行示例。</summary>
        private static void CreatePrefab(string directory, AnimatorController controller, Sprite initialSprite)
        {
            var instance = new GameObject("FrameAnimation");
            try
            {
                instance.AddComponent<SpriteRenderer>().sprite = initialSprite;
                instance.AddComponent<Animator>().runtimeAnimatorController = controller;
                PrefabUtility.SaveAsPrefabAsset(instance, directory + "/FrameAnimation.prefab", out bool success);
                if (!success) throw new InvalidOperationException("播放 Prefab 保存失败。");
            }
            finally
            {
                UnityEngine.Object.DestroyImmediate(instance);
            }
        }
    }
}
