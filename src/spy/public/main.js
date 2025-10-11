const socket = new Socket("./");
const tiaoom = new Tiaoom({ socket });

class Game {
  constructor() {
    this.tiaoom = new Tiaoom({ socket });
  }
  
  static connect() {
    const playerId = document.getElementById("playerId").value;
    const playerName = document.getElementById("playerName").value;
    tiaoom.connect({ id: playerId, name: playerName, attributes: {} }).then(() => {
      api.getPlayers().then(players => {
        tiaoom.players = players.map(player => new Player(player));
        this.updatePlayers(tiaoom.players);
      });
    });
    tiaoom.onPlayerList(players => {
      tiaoom.players = players.map(player => new Player(player));
      this.updatePlayers(tiaoom.players);
    });
  }

  static updatePlayers(players) {
    const ele = document.getElementById('onlinePlayers');
    if (!ele) return;
    ele.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
  }
}

Game.connect();