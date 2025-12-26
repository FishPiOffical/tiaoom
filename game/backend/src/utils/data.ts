import { AppDataSource } from "@/entities";
import { PlayerStats } from "@/entities/PlayerStats";

export interface GameStats {
  type: string;
  total: number;
  wins: number;
  draws: number;
  losses: number;
}

export async function getPlayerStats(username: string): Promise<GameStats[]> {
  const statsRepo = AppDataSource.getRepository(PlayerStats);
  const stats = await statsRepo.find({
    where: { player: username }
  });

  return stats.map(s => ({
    type: s.type,
    total: s.total,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses
  }));
}

export async function updatePlayerStats(username: string, type: string, result: 'win' | 'draw' | 'loss') {
  const statsRepo = AppDataSource.getRepository(PlayerStats);
  
  const incrementData = {
    total: 1,
    wins: result === 'win' ? 1 : 0,
    draws: result === 'draw' ? 1 : 0,
    losses: result === 'loss' ? 1 : 0
  };

  const update = async (id: number) => {
    await statsRepo.createQueryBuilder()
      .update()
      .set({
        total: () => "total + 1",
        wins: () => `wins + ${incrementData.wins}`,
        draws: () => `draws + ${incrementData.draws}`,
        losses: () => `losses + ${incrementData.losses}`
      })
      .where("id = :id", { id })
      .execute();
  };

  // 尝试查找记录
  const existing = await statsRepo.findOne({
    where: { player: username, type }
  });

  if (existing) {
    await update(existing.id);
  } else {
    // 尝试插入，如果并发导致插入失败（唯一索引冲突），则回退到更新
    try {
      await statsRepo.save({
        player: username,
        type,
        ...incrementData
      });
    } catch (e) {
      // 假设是唯一索引冲突，再次尝试更新
      const retryExisting = await statsRepo.findOne({
        where: { player: username, type }
      });
      if (retryExisting) {
        await update(retryExisting.id);
      }
    }
  }
}
