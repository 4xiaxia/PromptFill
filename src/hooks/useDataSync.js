/**
 * 智能多源数据同步 Hook
 * 在应用启动时并行检查云端和静态两个数据源，拉取最新版本
 */
import { useEffect } from 'react';
import { smartFetch } from '../utils/platform';

const DATA_SOURCES = {
  cloud: import.meta.env.VITE_DATA_API_URL || "https://data.tanshilong.com/data", // 宝塔后端 (最高优先级)
  cloud: import.meta.env.VITE_DATA_CLOUD_URL || "https://data.tanshilong.com/data", // 云端数据源 (最高优先级)
  static: "/data" // Vercel/本地 静态目录 (同步 Git)
};

export const useDataSync = ({
  lastAppliedDataVersion,
  SYSTEM_DATA_VERSION,
  setTemplates,
  setBanks,
  setDefaults,
  setCategories,
  setLastAppliedDataVersion,
}) => {
  useEffect(() => {
    const syncData = async () => {
      try {
        console.log("[Sync] 正在检查数据更新...");

        // 1. 并行获取各源版本号
        const results = await Promise.allSettled([
          smartFetch(`${DATA_SOURCES.cloud}/version.json?t=${Date.now()}`).then(r => r.json()),
          smartFetch(`${DATA_SOURCES.static}/version.json?t=${Date.now()}`).then(r => r.json()),
        ]);

        let bestSource = null;
        let maxVersion = lastAppliedDataVersion || SYSTEM_DATA_VERSION;

        // 2. 比对哪个源的版本最新
        results.forEach((res, index) => {
          if (res.status === 'fulfilled' && res.value.dataVersion) {
            if (res.value.dataVersion > maxVersion) {
              maxVersion = res.value.dataVersion;
              bestSource = index === 0 ? DATA_SOURCES.cloud : DATA_SOURCES.static;
            }
          }
        });

        // 3. 如果发现了更新的版本，执行拉取
        if (bestSource) {
          console.log(`[Sync] 发现更新版本 ${maxVersion}，来源: ${bestSource}`);
          const [tplRes, bankRes] = await Promise.all([
            smartFetch(`${bestSource}/templates.json`),
            smartFetch(`${bestSource}/banks.json`),
          ]);

          if (tplRes.ok && bankRes.ok) {
            const newTemplates = await tplRes.json();
            const newBanksData = await bankRes.json();

            setTemplates(newTemplates.config || newTemplates);
            setBanks(newBanksData.banks);
            setDefaults(newBanksData.defaults);
            setCategories(newBanksData.categories);
            setLastAppliedDataVersion(maxVersion);

            console.log("[Sync] 数据同步成功");
          }
        } else {
          console.log("[Sync] 当前数据已是最新");
        }
      } catch (e) {
        console.warn("[Sync] 同步过程中出现非致命异常:", e.message);
      }
    };

    syncData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在挂载时执行一次
};
