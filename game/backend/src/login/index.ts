import { User, UserRepo } from "@/entities";
import { isConfigured } from "@/utils/config";

export async function saveUser(userInfo: { id: string, name: string, nickname?: string, avatar?: string, ip?: string }, isAdmin = false) {
  const user = new User(userInfo.id, userInfo.name, userInfo.nickname || userInfo.name);
  user.id = userInfo.id;
  user.avatar = userInfo.avatar || '';
  user.lastLogin = Date.now();
  user.from = 'fishpi';
  user.ip = userInfo.ip || '';
  user.isAdmin = isAdmin;
  if (!isConfigured()) return user;
  const existingUser = await UserRepo().findOneBy({ id: user.id });
  if (existingUser) {
    await UserRepo().update({ id: user.id }, { ...user, ip: user.ip || undefined});
  } else {
    await UserRepo().save(UserRepo().create(user));
  }
  return user;
}