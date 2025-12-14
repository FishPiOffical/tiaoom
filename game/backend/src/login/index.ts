import { User, UserRepo } from "@/entities";

export async function saveUser(userInfo: { id: string, name: string, nickname?: string, avatar?: string, ip: string }) {
  const user = new User(userInfo.id, userInfo.name, userInfo.nickname || userInfo.name);
  user.id = userInfo.id;
  user.avatar = userInfo.avatar || '';
  user.lastLogin = Date.now();
  user.from = 'fishpi';
  user.ip = userInfo.ip;
  const existingUser = await UserRepo.findOneBy({ id: user.id });
  if (existingUser) {
    await UserRepo.update({ id: user.id }, user);
  } else {
    await UserRepo.save(UserRepo.create(user));
  }
  return user;
}