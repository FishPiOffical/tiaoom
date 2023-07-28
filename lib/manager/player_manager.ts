import { Player } from "@lib/models/player";

export class PlayerManager {
  playerList: Array<Player> = [];
  createPlayer(id: string, data: any) {
    var player = new Player(id, data);
    this.playerList.push(player);
    return player;
  }
  deletePlayer(id: string) {
    var index = this.playerList.findIndex((player) => {
      return player.id == id;
    });
    if (index > -1) {
      this.playerList.splice(index, 1);
    }
  }

  getPlayer(id: string) {
    var index = this.playerList.findIndex((player) => {
      return player.id == id;
    });
    if (index > -1) {
      return this.playerList[index];
    }
    return null;
  }

  private static instance: PlayerManager;
  public static getInstance() {
    if (!PlayerManager.instance) {
      PlayerManager.instance = new PlayerManager();
    }
    return PlayerManager.instance;
  }
}
