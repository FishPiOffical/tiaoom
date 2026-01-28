import { Request, Response } from "express";
import utils from '../utils';
import { saveUser } from './index';
import { UserBindRepo, UserRepo } from "@/entities";
const clientId = utils.config?.login.githubClientId || '';

export async function bind(req: Request, res: Response) {
  if (!req.session.player) {
    req.session.error = "请先登录后再进行绑定操作";
    return res.redirect("/#/login");
  }
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  if (!clientId) return res.end('GitHub OAuth 未配置，请联系管理员');
  if (req.query['code']) {
    const accessToken = await verify(req);
    if (accessToken) {
      const userInfo = await getUserInfo(accessToken);
      // 绑定逻辑
      const user = req.session.player;
      if (user) {
        const bindUser = UserBindRepo().create({
          id: user.id,
          username: user.username,
          from: 'github',
          thirdPartyId: userInfo.id,
          thirdPartyNickname: userInfo.name || userInfo.login,
          thirdPartyUsername: userInfo.login,
        })
        await UserBindRepo().save(bindUser);
      }
    }
    req.session.isBinding = false;
    return res.redirect("/u/" + (req.session.player ? req.session.player.username : ''));
  }
  req.session.isBinding = true;
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=https%3A%2F%2F${domain}%2Fapi%2Flogin%2Fgithub&scope=user:email`);
}

export async function login(req: Request, res: Response) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  if (!clientId) return res.end('GitHub OAuth 未配置，请联系管理员');
  if (req.query['code']) {
    const accessToken = await verify(req);
    if (accessToken) {
      const userInfo = await getUserInfo(accessToken);
      const bind = await UserBindRepo().findOneBy({ from: 'github', thirdPartyId: String(userInfo.id) });
      if (bind) {
        const user = await UserRepo().findOneBy({ id: bind.id });
        if (user) {
          req.session.player = user;
          return res.redirect("/");
        }
      }
      req.session.player = await saveUser({
        name: 'github-' + userInfo.login,
        nickname: userInfo.name || userInfo.login,
        id: userInfo.id,
        from: 'github',
        avatar: userInfo.avatar_url, 
        ip: req.header('x-forwarded-for') || req.header('x-real-ip') || req.socket.remoteAddress || req.ip || ''
      });
      return res.redirect("/");
    } else {
      req.session.error = "登录验证失败，请重试";
      return res.redirect("/login");
    }
  }
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=https%3A%2F%2F${domain}%2Fapi%2Flogin%2Fgithub&scope=user:email`);
}

function verify(req: Request) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  const verifyReq = {
    client_id: utils.config?.login.githubClientId,
    client_secret: utils.config?.login.githubClientSecret,
    code: req.query['code'],
    redirect_uri: `https://${domain}/api/login/github`,
  }
  return fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(verifyReq)
  }).then(res => res.json()).then(data => {
    return data.access_token;
  })
}

function getUserInfo(access_token: string) {
  return fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/vnd.github+json',
    }
  }).then(res => res.json()).then(data => {
    return data;
  });;
}