class GameCore extends Tiaoom {
  constructor(address) {
    super();
    this.address = address;
  }

  /**
   * 连接服务器
   */
  connect() {
    this.socket = new ReconnectingWebSocket(this.address, null, {debug: true, reconnectInterval: 3000});
    this.socket.onopen = () => {
      this.emit('sys.ready');
    };
    this.socket.onmessage = ({ data: msg }) => {
      const message = JSON.parse(msg);
      const { type, data, sender } = message;
      this.emit(type, data, sender);
    };
    this.socket.onerror = (err) => {
      console.log("Socket error:", err);
      this.emit('sys.error', err);
    };
    this.socket.onclose = () => {
      this.emit('sys.close');
    };
  }

  /**
   * 关闭连接
   */
  close() {
    this.socket.close();
  }

  /**
   * 发送消息
   * @param {string} type 消息类型 
   * @param {object} data 消息内容
   * @returns 
   */
  send({ type, data }) {
    this.socket.send(JSON.stringify({ type, data }));
    return this;
  }

  /**
   * 发送聊天消息
   * @param {string} message 消息内容
   * @param {string} roomId 房间ID
   */
  say(message, roomId) {
    this.command(roomId, { type: 'say', data: message });
  }

  /**
   * 初始化玩家游戏状态
   * @param {string} roomId 房间ID
   * @param {object} player 玩家信息
   * @returns 
   */
  init(roomId, player) {
    this.send({ type: "room.player-command", data: { id: roomId, type: 'status', data: player } });
    return this;
  }

  /**
   * 房间指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onCommand(cb, on=true) {
    this.onPlayerCommand(cb, on);
    this.onRoomCommand(cb, on);
    return this;
  }

  /**
   * 消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onMessage(cb, on=true) {
    this.onPlayerMessage(cb, on);
    this.onRoomMessage(cb, on);
    return this;
  }
}