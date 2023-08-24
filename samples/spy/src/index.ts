import { IPlayer, Player } from "@lib/models/player";
import { MessagePackage, Room, RoomPlayer, Tiaoom } from "@lib/index";
import { SocketManager } from "./socket";

const questions = [
  ['蝴蝶', '蜜蜂'],
  ['婚纱', '喜服'],
  ['小笼包', '灌汤包'],
  ['洗发露','护发素']
];

export class Controller {
  tiao = new Tiaoom({ socket: new SocketManager()});
  constructor() {
  }

  run() {
    this.tiao.run().on("room", (room: Room) => {
      console.log("room:", room);
      const players: RoomPlayer[] = [];
      const alivePlayers: RoomPlayer[] = [];
      let spyPlayer: RoomPlayer;
      room.on('join', (player: RoomPlayer) => {
        console.log("player join:", player);
        players.push(player);
      })
      room.on('leave', (player: RoomPlayer) => {
        console.log("player leave:", player);
        players.splice(players.findIndex((p) => p.id == player.id), 1);
      });
      room.on('player-ready', (player: RoomPlayer) => {
        console.log("player ready:", player);
      });
      room.on('all-ready', (players: RoomPlayer[]) => {
        console.log("all player ready:", players);
      });
      room.on('player-unready', (player: RoomPlayer) => {
        console.log("player unready:", player);
      });
      room.on('command', (message: MessagePackage) => {
        console.log("room message:", message);
        const vote: RoomPlayer[] = [];
        const cannotVotePlayer: RoomPlayer[] = [];
        const sender = players.find((p) => p.id == message.sender?.id)!;
        /**
         * # room command
         * - talk: cue next player talk
         * - talked: the player talk over
         * - vote: begin vote
         * - voted: the player voted
         * - end: game end
         * 
         * # player command
         * - word: send word to player
         * - dead: player dead
         */
        switch (message.type) {
          case 'talked':
            const playIndex = players.findIndex((p) => p.id == sender.id);
            const nextPlayer = (cannotVotePlayer.length ? cannotVotePlayer : alivePlayers).slice(playIndex + 1)[0];
            if (!nextPlayer) {
              room.emit('message', `Player talk over. vote begin.`);
              room.emit('command', { type: 'vote' });
              return;
            }
            room.emit('message', `Player ${sender.name} over. Player ${nextPlayer.name} talking.`);
            room.emit('command', { type: 'talk', data: { player: nextPlayer } });
            break;
          case 'voted':
            const votePlayer = players.find((p) => p.id == message.data.id)
            if (votePlayer) vote.push(votePlayer);
            else sender.emit('message', `Player ${message.data.name} is not in room.`);
            if (vote.length != players.length) return;
  
            const voteResult: { [key: string]: number } = vote.reduce((result, player) => {
              result[player.id] = (result[player.id] || 0) + 1;
              return result;
            }, {} as { [key: string]: number });
            const maxVote = Math.max(...Object.values(voteResult));
            const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => players.find((p) => p.id == id)!);
            if (maxVotePlayer.length > 1) {
              room.emit('message', `Player ${maxVotePlayer.map(p => p!.name).join(',')} are same votes. vote again`);
              vote.splice(0, vote.length);
              cannotVotePlayer.push(...maxVotePlayer);
              room.emit('command', { type: 'talk', data: { player: alivePlayers.find(p => !cannotVotePlayer.includes(p)) } });
              return;
            }
  
            vote.splice(0, vote.length);
            cannotVotePlayer.splice(0, cannotVotePlayer.length);
  
            const deadPlayer = maxVotePlayer[0]!;
            deadPlayer.emit('command', { type: 'dead' });
            alivePlayers.splice(alivePlayers.findIndex((p) => p.id == deadPlayer.id), 1);
  
            if (deadPlayer == spyPlayer) {
              room.emit('message', `Spy is dead. Player win.`);
            } else if (alivePlayers.length == 3) {
              room.emit('message', `Spy ${spyPlayer.name} win.`);
            } else {
              return room.emit('message', `Player ${deadPlayer.name} is dead. Game continue.`);
            }
            room.end();
            break;
          default:
            break;
        }
      });
      room.on('start', () => {
        console.log("room start");
        const mainWordIndex = Math.floor(Math.random() * 2);
        const spyWordIndex = mainWordIndex == 0 ? 1 : 0;
        const questWord = questions[Math.floor(Math.random() * questions.length)];
        const words = Array(players.length).fill(questWord[mainWordIndex]);
        const spyIndex = Math.floor(Math.random() * players.length);
        words[spyIndex] = questWord[spyWordIndex];
        spyPlayer = players[spyIndex];
        players.forEach((player, index) => {
          player.emit('command', { type: 'word', data: { word: words[index] } });
          alivePlayers.push(player);
        })
      });
      room.on('end', () => {
        console.log("room end");
        room.emit('command', { type: 'end' });
      });
      room.on('close', () => {
        console.log("room close");
      });
      room.on('error', (error: any) => {
        console.log("room error:", error);
      });
    });
    this.tiao.on('player', (player: Player) => {
      console.log("player:", player);
      player.on('command', (message: any) => {
        console.log("player command:", message);
      });
    })
    this.tiao.on("error", (error: any) => {
      console.log("error:", error);
    });  
  }
}

export async function main() {
}