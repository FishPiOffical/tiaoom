import { Request, Response } from "express";
import utils from '../utils';
import { saveUser } from './index';

const appId = utils.config?.login.wechatAppId || '';

export async function login(req: Request, res: Response) {
  const domain = new URL(req.headers.referer || `${req.protocol}://${req.headers.host}`).host;
  if (!appId) return res.end('微信OAuth 未配置，请联系管理员');
  if (req.query['code']) {
    const tokenData = await verify(req);
    if (tokenData.access_token) {
      const userInfo = await getUserInfo(tokenData.access_token, tokenData.openid);
      req.session.player = await saveUser({
        name: 'wechat-' + userInfo.openid,
        nickname: userInfo.nickname,
        id: userInfo.openid,
        from: 'wechat',
        avatar: userInfo.headimgurl,
        ip: req.header('x-forwarded-for') || req.header('x-real-ip') || req.socket.remoteAddress || req.ip || ''
      });
      return res.redirect("/");
    } else {
      req.session.error = "登录验证失败，请重试";
      return res.redirect("/login");
    }
  }
  res.redirect(`https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=https%3A%2F%2F${domain}%2Fapi%2Flogin%2Fwechat&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect`);
}

async function verify(req: Request) {
  const verifyReq = {
    appid: utils.config?.login.wechatAppId,
    secret: utils.config?.login.wechatAppSecret,
    code: req.query['code'],
    grant_type: 'authorization_code'
  };
  const params = new URLSearchParams(verifyReq as any);
  const response = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?${params}`, {
    method: 'GET'
  });
  const data = await response.json();
  return data;
}

async function getUserInfo(access_token: string, openid: string) {
  const response = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`, {
    method: 'GET'
  });
  const data = await response.json();
  return data;
}