#if APP_CREATOR_TAPTAP_CORE && APP_CREATOR_TAPTAP_CLOUD_SAVE
using System.Collections.Generic;
using System.Threading.Tasks;
using TapSDK.CloudSave;

namespace AppCreator.ChannelSdk
{
    /// <summary>云存档的强类型官方调用。</summary>
    public sealed partial class TapTapSdk
    {
        /// <summary>注册云存档事件。</summary>
        public void RegisterCloudSaveCallback(ITapCloudSaveCallback callback) { ensureReady(); TapTapCloudSave.RegisterCloudSaveCallback(callback); }
        /// <summary>注销原回调，允许渠道释放后清理业务监听。</summary>
        public void UnregisterCloudSaveCallback(ITapCloudSaveCallback callback) { TapTapCloudSave.UnregisterCloudSaveCallback(callback); }
        /// <summary>创建新存档，路径由项目安全管理。</summary>
        public Task<ArchiveData> CreateArchive(ArchiveMetadata metadata, string file, string cover) { ensureReady(); return TapTapCloudSave.CreateArchive(metadata, file, cover); }
        /// <summary>更新指定存档；冲突处理由业务决定。</summary>
        public Task<ArchiveData> UpdateArchive(string id, ArchiveMetadata metadata, string file, string cover) { ensureReady(); return TapTapCloudSave.UpdateArchive(id, metadata, file, cover); }
        /// <summary>删除指定云存档。</summary>
        public Task<ArchiveData> DeleteArchive(string id) { ensureReady(); return TapTapCloudSave.DeleteArchive(id); }
        /// <summary>读取当前用户云存档列表。</summary>
        public Task<List<ArchiveData>> GetArchiveList() { ensureReady(); return TapTapCloudSave.GetArchiveList(); }
        /// <summary>读取指定存档数据。</summary>
        public Task<byte[]> GetArchiveData(string id, string fileId) { ensureReady(); return TapTapCloudSave.GetArchiveData(id, fileId); }
        /// <summary>读取指定存档封面。</summary>
        public Task<byte[]> GetArchiveCover(string id, string fileId) { ensureReady(); return TapTapCloudSave.GetArchiveCover(id, fileId); }
    }
}
#endif
