class defHttp {
  static get(url, options = {}) {
    return this.request({ url, method: 'GET', ...options });
  }

  static post(url, body, options = {}) {
    return this.request({ url, method: 'POST', body, ...options });
  }

  static request(options) {
    return fetch(options.url, {
      method: options.method || 'GET',
      headers: options.headers || { 'Content-Type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : null,
    }).then(response => response.json()).then(res => {
      if (res.code !== 0) {
        return Promise.reject(res.message || 'Unknown Error');
      }
      return res.data;
    });
  }
}

const api = {
  getPlayers() {
    return defHttp.get('/api/players');
  },
  getRooms() {
    return defHttp.get('/api/rooms');
  },
  getRoom(id) {
    return defHttp.get(`/api/rooms/${id}`);
  },
  getPlayer(id) {
    return defHttp.get(`/api/players/${id}`);
  },
}