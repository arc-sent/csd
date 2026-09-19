const pv = (process.env.FAKE_PV || 'e2e4 e7e5 g1f3').trim();
const mode = process.env.FAKE_MODE || 'normal';
const delay = Number(process.env.FAKE_DELAY || 0);

const say = line => process.stdout.write(line + '\n');

let buffer = '';
process.stdin.on('data', chunk => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    handle(line);
  }
});

function handle(line) {
  if (line === 'uci') {
    say('id name FakeEngine 1.0');
    say('uciok');
    return;
  }
  if (line === 'isready') {
    say('readyok');
    return;
  }
  if (line.startsWith('go')) {
    if (mode === 'hang') return;
    setTimeout(() => {
      if (mode === 'nomove') {
        say('info depth 1 score mate 0');
        say('bestmove (none)');
        return;
      }
      const moves = pv.split(/\s+/).filter(Boolean);
      say('info depth 1 score cp 10 pv ' + moves[0]);
      say('info depth 12 score cp 34 nodes 12345 pv ' + moves.join(' '));
      say('bestmove ' + moves[0] + (moves[1] ? ' ponder ' + moves[1] : ''));
    }, delay);
    return;
  }
  if (line === 'stop') {
    if (mode !== 'hang') say('bestmove ' + pv.split(/\s+/)[0]);
    return;
  }
  if (line === 'quit') process.exit(0);
}
