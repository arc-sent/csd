const { spawn } = require('child_process');
const { AppError } = require('../../shared/errors');

const DEFAULT_INIT_TIMEOUT = 10000;

function createEnginePool(options) {
  const opts = options || {};
  const enginePath = opts.path;
  const engineArgs = opts.args || [];
  const engineEnv = opts.env || null;
  const initTimeout = opts.initTimeout || DEFAULT_INIT_TIMEOUT;

  let child = null;
  let ready = null;
  let lineHandler = null;
  let queue = Promise.resolve();
  let shuttingDown = false;

  function killEngine() {
    if (child) {
      try { child.kill(); } catch (e) { }
    }
    child = null;
    ready = null;
    lineHandler = null;
  }

  function send(command) {
    if (!child || !child.stdin.writable) {
      throw new AppError(503, 'Шахматный движок недоступен');
    }
    child.stdin.write(command + '\n');
  }

  function attachReader(proc) {
    let buffer = '';
    proc.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (line && lineHandler) lineHandler(line);
      }
    });
  }

  function startEngine() {
    if (ready) return ready;

    if (!enginePath) {
      return Promise.reject(new AppError(
        503,
        'Путь к Stockfish не задан. Укажите STOCKFISH_PATH в .env сервера.'
      ));
    }

    ready = new Promise((resolve, reject) => {
      let proc;
      try {
        proc = spawn(enginePath, engineArgs, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: engineEnv ? Object.assign({}, process.env, engineEnv) : process.env
        });
      } catch (err) {
        killEngine();
        reject(new AppError(503, 'Не удалось запустить Stockfish: ' + err.message));
        return;
      }

      child = proc;
      attachReader(proc);

      proc.on('error', err => {
        killEngine();
        reject(new AppError(503, 'Не удалось запустить Stockfish: ' + err.message));
      });

      proc.on('exit', () => {
        if (child === proc) killEngine();
      });

      const timer = setTimeout(() => {
        killEngine();
        reject(new AppError(504, 'Движок не ответил на рукопожатие UCI'));
      }, initTimeout);

      let sawUciOk = false;
      lineHandler = line => {
        if (line === 'uciok') {
          sawUciOk = true;
          send('isready');
        } else if (line === 'readyok' && sawUciOk) {
          clearTimeout(timer);
          lineHandler = null;
          resolve();
        }
      };

      try {
        send('uci');
      } catch (err) {
        clearTimeout(timer);
        killEngine();
        reject(err);
      }
    }).catch(err => {
      ready = null;
      throw err;
    });

    return ready;
  }

  function parseInfoLine(line) {
    const tokens = line.split(/\s+/);
    const info = {};
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === 'depth') {
        info.depth = Number(tokens[i + 1]);
      } else if (tokens[i] === 'score') {
        const type = tokens[i + 1];
        const value = Number(tokens[i + 2]);
        if (type === 'cp' || type === 'mate') info.score = { type, value };
      } else if (tokens[i] === 'pv') {
        info.pv = tokens.slice(i + 1);
        break;
      }
    }
    return info;
  }

  function runAnalysis(params) {
    return new Promise((resolve, reject) => {
      let best = null;
      let settled = false;
      let timer = null;
      let killTimer = null;

      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(killTimer);
        lineHandler = null;
        if (err) reject(err); else resolve(value);
      };

      lineHandler = line => {
        if (line.startsWith('info ')) {
          const info = parseInfoLine(line);
          if (info.pv && info.pv.length) best = info;
          return;
        }
        if (line.startsWith('bestmove')) {
          const parts = line.split(/\s+/);
          const bestMove = parts[1];
          const ponderIndex = parts.indexOf('ponder');
          const hasMove = bestMove && bestMove !== '(none)' && bestMove !== '0000';
          finish(null, {
            bestMove: hasMove ? bestMove : null,
            ponder: ponderIndex !== -1 ? parts[ponderIndex + 1] : null,
            pv: hasMove && best && best.pv ? best.pv : [],
            score: best && best.score ? best.score : null,
            depth: best && best.depth != null ? best.depth : null
          });
        }
      };

      timer = setTimeout(() => {
        try { send('stop'); } catch (e) { }
        killTimer = setTimeout(() => {
          if (!settled) {
            killEngine();
            finish(new AppError(504, 'Движок не успел рассчитать позицию за отведённое время'));
          }
        }, 1000);
      }, params.timeout);

      try {
        send('ucinewgame');
        send('position fen ' + params.fen);
        send(params.movetime ? 'go movetime ' + params.movetime : 'go depth ' + params.depth);
      } catch (err) {
        finish(err);
      }
    });
  }

  function analyze(params) {
    const task = queue.then(async () => {
      if (shuttingDown) throw new AppError(503, 'Сервер останавливается');
      await startEngine();
      return runAnalysis(params);
    });
    queue = task.catch(() => {});
    return task;
  }

  function shutdown() {
    shuttingDown = true;
    killEngine();
  }

  return { analyze, shutdown, isRunning: () => Boolean(child) };
}

module.exports = { createEnginePool };
