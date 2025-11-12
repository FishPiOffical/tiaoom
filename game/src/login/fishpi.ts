import { Request, Response } from "express";

export async function login(req: Request, res: Response) {
  const domain = 'room.net.librejo.cn';
  if (req.query['openid.mode'] === 'id_res') {
    const userId = await verify(req);
    if (userId) {
      const userInfo = await getUserInfo(userId);
      req.session.player = { name: userInfo.data.userNickname || userInfo.data.userName, id: userId };
      return res.redirect("/");
    } else {
      req.session.error = "登录验证失败，请重试";
      return res.redirect("/login");
    }
  }
  res.redirect(`https://fishpi.cn/openid/login?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup&openid.return_to=https%3A%2F%2F${domain}%2Flogin%2Ffishpi&openid.realm=https%3A%2F%2F${domain}&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select`);
}

function verify(req: Request) {
  const openVerify = {
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "check_authentication",
      "openid.op_endpoint": req.query['openid.op_endpoint'],
      "openid.return_to": req.query['openid.return_to'],
      "openid.identity": req.query['openid.identity'],
      "openid.claimed_id": req.query['openid.claimed_id'],
      "openid.response_nonce": req.query['openid.response_nonce'],
      "openid.assoc_handle": req.query['openid.assoc_handle'],
      "openid.sig": req.query['openid.sig'],
  }
  return fetch('https://fishpi.cn/openid/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openVerify)
    }).then(res => res.text()).then(text => {
      if (text.includes('is_valid:true')) {
        const claimed_id = req.query['openid.claimed_id'] as string;
        return claimed_id.split('/').pop();
      }
      return null;
    })
}

function getUserInfo(userId: string) {
  return fetch(`https://fishpi.cn/api/user/getInfoById?userId=${userId}`).then(res => res.json());
}