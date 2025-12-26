import { Request, Response } from "express";
import { saveUser } from ".";
import Fishpi from 'fishpi'

const fishpi = new Fishpi();

export async function login(req: Request, res: Response) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).origin;
  try {
    if (req.query['openid.mode'] === 'id_res') {
      const userInfo = await fishpi.authVerify(req.query as Record<string, string>);
      if (userInfo) {
        const userDetail = await fishpi.user(userInfo.userName);
        const user = await saveUser(
          { 
            name: userInfo.userName, 
            nickname: userInfo.userNickname || userInfo.userName,
            id: userInfo.oId, 
            avatar: userInfo.userAvatarURL, 
            ip: req.header('x-forwarded-for') || req.header('x-real-ip') || req.socket.remoteAddress || req.ip || ''
          },
          userDetail?.role == '管理员' ? true : false
        );
        req.session.player = user;
        return res.redirect("/");
      } else {
        req.session.error = "登录验证失败，请重试";
        return res.redirect("/login");
      }
    }
  } catch (error) {
    req.session.error = "登录验证失败，请重试：" + (error instanceof Error ? `(${error.message})` : "");
    return res.redirect("/#/login");
  }
  res.redirect(fishpi.generateAuthURL(`${domain}/api/login/fishpi`));
}

export function register(req: Request, res: Response) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).origin;
  res.redirect(`https://fishpi.cn/register?goto=${encodeURIComponent(fishpi.generateAuthURL(`${domain}/api/login/fishpi`))}`);
}

export function updateUserInfo(userId: string, req?: Request) {
  return fishpi.userByoId(userId).then(async (userInfo) => {
    if (userInfo) {
      const userDetail = await fishpi.user(userInfo.userName);
      const user = await saveUser(
        { 
          name: userInfo.userName, 
          nickname: userInfo.userNickname || userInfo.userName,
          id: userInfo.oId, 
          avatar: userInfo.userAvatarURL, 
          ip: req?.header('x-forwarded-for') || req?.header('x-real-ip') || req?.socket.remoteAddress || req?.ip
        },
        userDetail?.role == '管理员' ? true : false
      );
      return user;
    }
    return undefined;
  });
}