import http from "http";
import { IPlayer, Player, PlayerStatus } from "@lib/models/player";
import { IRoomPlayer, MessagePackage, Room, RoomPlayer, Tiaoom } from "@lib/index";
import { SocketManager } from "./socket";

const questions = [
  ['蝴蝶', '蜜蜂'],
  ['婚纱', '喜服'],
  ['小笼包', '灌汤包'],
  ['洗发露','护发素']
];

export class Controller extends Tiaoom {
  constructor(server: http.Server) {
    super({ socket: new SocketManager(server) });
  }

  run() {
    return super.run().on("room", (room: Room) => {
      console.log("room:", room);
      let words: string[] = [];
      let players: RoomPlayer[] = [];
      const alivePlayers: RoomPlayer[] = [];
      let currentTalkPlayer: RoomPlayer;
      let spyPlayer: RoomPlayer;
      let gameStatus: 'waiting' | 'talking' | 'voting' = 'waiting';
              
      const vote: RoomPlayer[] = [];
      const votePlayers: RoomPlayer[] = [];
      const cannotVotePlayer: RoomPlayer[] = [];

      room.on('join', (player: IRoomPlayer) => {
        console.log("player join:", player);
        players.push(new RoomPlayer(player));
      })
      room.on('leave', (player: IRoomPlayer) => {
        console.log("player leave:", player);
        players.splice(players.findIndex((p) => p.id == player.id), 1);
      });
      room.on('player-ready', (player: IRoomPlayer) => {
        console.log("player ready:", player);
        const p = players.find((p) => p.id == player.id);
        if (p) Object.assign(p, new RoomPlayer(player));
      });
      room.on('all-ready', (allPlayers: IRoomPlayer[]) => {
        console.log("all player ready:", allPlayers);
        players = allPlayers.map((p) => new RoomPlayer(p));
      });
      room.on('player-unready', (player: IRoomPlayer) => {
        console.log("player unready:", player);
        const p = this.players.find((p) => p.id == player.id);
        if (p) Object.assign(p, new RoomPlayer(player));
      });
      room.on('player-command', (message: MessagePackage) => {
        console.log("room message:", message);
        const sender = players.find((p) => p.id == message.sender?.id)!;
        /**
         * # room command
         * - say: player say something
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
          case 'say':
            if (gameStatus == 'voting') {
              sender.emit('message', `[System]: It's voting time, you cannot talk.`);
              return;
            }
            if (gameStatus == 'talking' && sender.id != currentTalkPlayer.id) {
              sender.emit('message', `[System]: It's not your turn to talk.`);
              return;
            }
            room.emit('message', `[${sender.name}]: ${message.data}`);
            break;
          case 'talked':
            if (gameStatus != 'talking') {
              sender.emit('message', `[System]: It's not talking time.`);
              return;
            }
            if (sender.id != currentTalkPlayer.id) {
              sender.emit('message', `[System]: It's not your turn to talk.`);
              return;
            }
            const playIndex = players.findIndex((p) => p.id == sender.id);
            const nextPlayer = (cannotVotePlayer.length ? cannotVotePlayer : alivePlayers).slice(playIndex + 1)[0];
            if (!nextPlayer) {
              room.emit('message', `[System]: Players all over talk. vote begin.`);
              if (cannotVotePlayer.length) {
                alivePlayers.forEach((p) => {
                  if (!cannotVotePlayer.includes(p)) p.emit('command', { type: 'vote', data: cannotVotePlayer });
                })
                sender.emit('command', { type: 'vote', data: [] });
              }
              else room.emit('command', { type: 'vote' });
              gameStatus = 'voting';
              return;
            }
            currentTalkPlayer = nextPlayer;
            room.emit('message', `[System]: Player ${sender.name} over talk. Player ${nextPlayer.name} talking.`);
            room.emit('command', { type: 'talk', data: { player: nextPlayer } });
            break;
          case 'voted':
            if (gameStatus != 'voting') {
              sender.emit('message', `[System]: It's not voting time.`);
              return;
            }
            if (votePlayers.includes(sender)) {
              sender.emit('message', `[System]: You have already voted.`);
              return;
            }
            if (cannotVotePlayer.includes(sender)) {
              sender.emit('message', `[System]: You cannot vote this round.`);
              return;
            }

            const votePlayer = players.find((p) => p.id == message.data.id)
            if (votePlayer && (cannotVotePlayer.length ? cannotVotePlayer : players).includes(votePlayer)) vote.push(votePlayer);
            else if (votePlayer) return sender.emit('message', `[System]: Player ${votePlayer?.name} is can not be vote.`);
            else return sender.emit('message', `[System]: Player you voted is not in room.`);

            votePlayers.push(sender);
            sender.emit('command', { type: 'voted' });
            room.emit('message', `[System]: Player ${sender.name} voted.`);
            if (votePlayers.length != alivePlayers.length - cannotVotePlayer.length) return;
  
            const voteResult: { [key: string]: number } = vote.reduce((result, player) => {
              result[player.id] = (result[player.id] || 0) + 1;
              return result;
            }, {} as { [key: string]: number });
            const maxVote = Math.max(...Object.values(voteResult));
            const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => players.find((p) => p.id == id)!);
            if (maxVotePlayer.length > 1) {
              room.emit('message', `[System]: Player ${maxVotePlayer.map(p => p!.name).join(',')} are same votes. please let them talk again.`);
              vote.splice(0, vote.length);
              votePlayers.splice(0, votePlayers.length);
              cannotVotePlayer.push(...maxVotePlayer);
              currentTalkPlayer = cannotVotePlayer[0];
              room.emit('command', { type: 'talk', data: { player: currentTalkPlayer } });
              gameStatus = 'talking';
              return;
            }
  
            vote.splice(0, vote.length);
            cannotVotePlayer.splice(0, cannotVotePlayer.length);
            votePlayers.splice(0, votePlayers.length);
            gameStatus = 'waiting';

            const deadPlayer = maxVotePlayer[0]!;
            deadPlayer.emit('command', { type: 'dead' });
            alivePlayers.splice(alivePlayers.findIndex((p) => p.id == deadPlayer.id), 1);
  
            if (deadPlayer == spyPlayer) {
              room.emit('message', `[System]: Player ${deadPlayer.name} is dead. Spy is dead. Players win.`);
            } else if (alivePlayers.length == 3) {
              room.emit('message', `[System]: Player ${deadPlayer.name} is dead. Spy ${spyPlayer.name} win.`);
            } else {
              gameStatus = 'talking';
              return room.emit('message', `[System]: Player ${deadPlayer.name} is dead. Game continue.`);
            }
            room.end();
            break;
          case 'status': {
            const playerIndex = players.findIndex((p) => p.id == message.data.id);
            const player = players[playerIndex];
            if (!player) break;
            player.emit('command', {
              type: 'status',
              data: {
                word: words[playerIndex],
                status: gameStatus,
                talk: currentTalkPlayer,
                voted: votePlayers.some((p) => p.id == player.id),
                deadPlayers: players.filter((p) => !alivePlayers.includes(p)),
                canVotePlayers: cannotVotePlayer.length ? cannotVotePlayer : alivePlayers
              }
            });
            break;
          }
          default:
            break;
        }
      });
      room.on('start', () => {
        console.log("room start");

        vote.splice(0, vote.length);
        cannotVotePlayer.splice(0, cannotVotePlayer.length);
        votePlayers.splice(0, votePlayers.length);
        alivePlayers.splice(0, alivePlayers.length);
        currentTalkPlayer = undefined!;
        spyPlayer = undefined!;
        gameStatus = 'waiting';
        
        if (players.length < room.minSize) {
          return room.emit('message', `[System]: Not enough players to start the game.`);
        }

        const mainWordIndex = Math.floor(Math.random() * 2);
        const spyWordIndex = mainWordIndex == 0 ? 1 : 0;
        const questWord = questions[Math.floor(Math.random() * questions.length)];
        words = Array(players.length).fill(questWord[mainWordIndex]);
        const spyIndex = Math.floor(Math.random() * players.length);
        words[spyIndex] = questWord[spyWordIndex];
        spyPlayer = players[spyIndex];
        players.forEach((player, index) => {
          player.emit('command', { type: 'word', data: { word: words[index] } });
          alivePlayers.push(player);
        })
        room.emit('message', `[System]: Game start. Player ${players[0].name} talking first.`);
        room.emit('command', { type: 'talk', data: { player: currentTalkPlayer = players[0] } });
        gameStatus = 'talking';
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
    }).on('player', (player: Player) => {
      console.log("player:", player);
      player.on('command', (message: any) => {
        console.log("player command:", message);
      });
    }).on("error", (error: any) => {
      console.log("error:", error);
    });
  }
}
