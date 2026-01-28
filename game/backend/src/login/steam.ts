import { Request, Response } from "express";
import { saveUser } from './index';
import utils from "../utils";
import { UserBindRepo, UserRepo } from "@/entities";

export async function login(req: Request, res: Response) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  if (req.query['openid.mode'] === 'id_res') {
    const userId = await verify(req);
    if (userId) {
      const bind = await UserBindRepo().findOneBy({ from: 'steam', thirdPartyId: userId });
      if (bind) {
        const user = await UserRepo().findOneBy({ id: bind.id });
        if (user) {
          req.session.player = user;
          return res.redirect("/");
        }
      }
      const [ userInfo ] = await getUserInfo(userId);
      req.session.player = await saveUser({ 
        name: 'steam-' + userInfo.profileurl.trim().split('/').slice(0, -1).pop() || userId, 
        nickname: userInfo.personaname, 
        id: userId,
        from: 'steam',
        avatar: userInfo.avatarfull, 
        ip: req.header('x-forwarded-for') || req.header('x-real-ip') || req.socket.remoteAddress || req.ip || ''
      });
      return res.redirect("/");
    } else {
      req.session.error = "登录验证失败，请重试";
      return res.redirect("/login");
    }
  }
  res.redirect(`https://steamcommunity.com/openid/login?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.return_to=https%3A%2F%2F${domain}%2Fapi%2Flogin%2Fsteam&openid.realm=https%3A%2F%2F${domain}&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select`);
}

function verify(req: Request) {
  const signeds = req.query['openid.signed']?.toString().split(',') || [];
  const openVerify = new FormData();
  openVerify.append("openid.ns", "http://specs.openid.net/auth/2.0");
  openVerify.append("openid.mode", "check_authentication");
  openVerify.append("openid.sig", req.query[`openid.sig`] as string);
  for (const key of signeds) {
    openVerify.append(`openid.${key}`, req.query[`openid.${key}`] as string);
  }
  return fetch(`${utils.config?.login.steamMirror || 'https://steamcommunity.com'}/openid/login`, {
    method: 'POST',
    body: openVerify
  }).then(res => res.text()).then(text => {
    if (text.includes('is_valid:true')) {
      const claimed_id = req.query['openid.claimed_id'] as string;
      return claimed_id.split('/').pop();
    }
    return null;
  })
}

function getUserInfo(steamid: string) {
  return fetch(`${utils.config?.login.steamMirror || 'https://api.steampowered.com'}/ISteamUser/GetPlayerSummaries/v2/?key=${utils.config?.login.steamApiKey}&steamids=${steamid}`)
    .then(res => res.json())
    .then(data => {
      return data.response.players;
    });
}

export async function bind(req: Request, res: Response) {
  if (!req.session.player) {
    req.session.error = "请先登录后再进行绑定操作";
    return res.redirect("/#/login");
  }
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  if (!utils.config?.login.steamApiKey) return res.end('Steam API 未配置，请联系管理员');
  if (req.query['openid.mode'] === 'id_res') {
    const userId = await verify(req);
    if (userId) {
      const [ userInfo ] = await getUserInfo(userId);
      // 绑定逻辑
      const user = req.session.player;
      if (user) {
        const bindUser = UserBindRepo().create({
          id: user.id,
          username: user.username,
          from: 'steam',
          thirdPartyId: userId,
          thirdPartyNickname: userInfo.personaname,
          thirdPartyUsername: userInfo.profileurl.trim().split('/').slice(0, -1).pop() || userId,
        })
        await UserBindRepo().save(bindUser);
      }
    }
    req.session.isBinding = false;
    return res.redirect("/u/" + (req.session.player ? req.session.player.username : ''));
  }
  req.session.isBinding = true;
  res.redirect(`https://steamcommunity.com/openid/login?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.return_to=https%3A%2F%2F${domain}%2Fapi%2Fbind%2Fsteam&openid.realm=https%3A%2F%2F${domain}&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select`);
}