import { Tiaoom } from "@lib/tiaoom";

const questions = [
  ['蝴蝶', '蜜蜂'],
  ['婚纱', '喜服'],
  ['小笼包', '灌汤包'],
  ['洗发露','护发素']
];

export async function main() {
  const tiao = new Tiaoom();
  tiao.run().on("room", (room: any) => {
    console.log("room:", room);
    const players: any[] = [];
    const alivePlayers: any[] = [];
    let spyPlayer: any = null;
    room.on('join', (player: any) => {
      console.log("player join:", player);
      players.push(player);
    })
    room.on('leave', (player: any) => {
      console.log("player leave:", player);
      players.splice(players.findIndex((p) => p.id == player.id), 1);
    });
    room.on('ready', (player: any) => {
      console.log("player ready:", player);
    });
    room.on('all-ready', (players: any) => {
      console.log("all player ready:", players);
    });
    room.on('unready', (player: any) => {
      console.log("player unready:", player);
    });
    room.on('message', (message: any, player: any) => {
      console.log("room message:", message);
      const vote = [];
      const cannotVotePlayer: any[] = [];
      switch (message.type) {
        case 'talk':
          const playIndex = players.findIndex((p) => p.id == player.id);
          const nextPlayer = alivePlayers.slice(playIndex + 1).find(p => !cannotVotePlayer.includes(p));
          if (!nextPlayer) {
            room.send('message', { type: 'message', data: `Player talk over. vote begin.` });
            room.send('message', { type: 'vote' });
            return;
          }
          room.send('message', { type: 'message', data: `Player ${player.name} over. Player ${nextPlayer.name} talking.` });
          room.send('message', { type: 'talk', data: { player: nextPlayer } });
          break;
        case 'vote':
          vote.push(player);
          if (vote.length != players.length) return;

          const voteResult: { [key: string]: number } = vote.reduce((result, player) => {
            result[player.id] = (result[player.id] || 0) + 1;
            return result;
          }, {});
          const maxVote = Math.max(...Object.values(voteResult));
          const maxVotePlayer = Object.keys(voteResult).filter((id) => voteResult[id] == maxVote).map((id) => players.find((p) => p.id == id));
          if (maxVotePlayer.length > 1) {
            room.send('message', { type: 'message', data: `Player ${maxVotePlayer.map(p => p.name).join(',')} are same votes. vote again` });
            vote.splice(0, vote.length);
            cannotVotePlayer.push(...maxVotePlayer);
            room.send('message', { type: 'talk', data: { player: alivePlayers.find(p => !cannotVotePlayer.includes(p)) } });
            return;
          }

          vote.splice(0, vote.length);
          cannotVotePlayer.splice(0, cannotVotePlayer.length);

          const deadPlayer = maxVotePlayer[0];
          deadPlayer.send('message', { type: 'dead' });
          alivePlayers.splice(alivePlayers.findIndex((p) => p.id == deadPlayer.id), 1);

          if (maxVotePlayer[0] == spyPlayer) {
            room.send('message', { type: 'message', data: `Spy is dead. Player win.` });
          } else if (alivePlayers.length == 3) {
            room.send('message', { type: 'message', data: `Spy ${spyPlayer.name} win.` });
          } else {
            return room.send('message', { type: 'message', data: `Player ${maxVotePlayer[0].name} is dead. Game continue.` });
          }
          room.end();
          break;
        default:
          break;
      }
    });
    room.on('start', () => {
      console.log("room start");
      room.broadcast('message', { type: 'start' }).then(() => {
        const mainWordIndex = Math.floor(Math.random() * 2);
        const spyWordIndex = mainWordIndex == 0 ? 1 : 0;
        const questWord = questions[Math.floor(Math.random() * questions.length)];
        const words = Array(players.length).fill(questWord[mainWordIndex]);
        const spyIndex = Math.floor(Math.random() * players.length);
        words[spyIndex] = questWord[spyWordIndex];
        spyPlayer = players[spyIndex];
        players.forEach((player, index) => {
          player.send('message', { type: 'word', data: { word: words[index] } });
          player.on('message', (message: any) => {
            console.log("message:", message);
            if (message.type == 'desc') {
              room.broadcast('message', { type: 'desc', data: { desc: message.data, player } });
            }
          })
          alivePlayers.push(player);
        })
      });
    });
    room.on('end', () => {
      console.log("room end");
      room.send('message', { type: 'end' });
    });
    room.on('close', () => {
      console.log("room close");
    });
    room.on('error', (error: any) => {
      console.log("room error:", error);
    });
  }).on("error", (error: any) => {
    console.log("error:", error);
  });
}