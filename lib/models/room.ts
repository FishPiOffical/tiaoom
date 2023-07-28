import { PlayerManager } from "@lib/manager/player_manager";
import { Player } from "./player";

export class Room {
  private playerManager: PlayerManager = PlayerManager.getInstance();
  id: string; // room id
  size: number = 10; // room size
  playerList: Array<Player> = []; // player list
  isAllPlayerReady: boolean =
    this.playerList.length == 0
      ? false
      : this.playerList.findIndex((target) => target.isReady === false) != -1; // is all player ready
  // is room full
  isFull: boolean = this.playerList.length == this.size;
  constructor(id: string, size: number) {
    this.id = id;
    this.size = size;
  }

  kickPlayerById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.kickPlayer(player);
    }
  }

  kickPlayer(player: Player) {
    var index = this.playerList.findIndex((p) => p.id == player.id);
    if (index > -1) {
      this.playerList.splice(index, 1);
    }
  }

  addPlayerById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.addPlayer(player);
    }
  }

  addPlayer(player: Player) {
    if (this.isFull) return;
    if (!this.isPlayerInRoom(player)) {
      this.playerList.push(player);
    }
  }

  playerReadyById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.playerReady(player);
    }
  }

  playerReady(player: Player) {
    if (this.isPlayerInRoom(player)) {
      player.isReady = true;
    }
  }

  playerUnReadyById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      this.playerUnReady(player);
    }
  }

  playerUnReady(player: Player) {
    if (this.isPlayerInRoom(player)) {
      player.isReady = false;
    }
  }

  isPlayerIdInRoom(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      return this.isPlayerInRoom(player);
    }
  }

  isPlayerInRoomById(playerId: string) {
    var player = this.playerManager.getPlayer(playerId);
    if (player) {
      return this.isPlayerInRoom(player);
    }
  }

  isPlayerInRoom(player: Player) {
    return this.playerList.find((p) => p.id == player.id);
  }
}
