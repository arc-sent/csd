// Обёртка над нативным процессом Stockfish (UCI-протокол).
//
// Держим ОДИН долгоживущий процесс и очередь задач: анализ идёт по одному
// запросу за раз, иначе вывод разных задач перемешается в общем stdout.
// Процесс поднимается лениво (при первом запросе), чтобы сервер стартовал
// даже без установленного движка, и перезапускается после падения/таймаута.
const { spawn } = require('child_process');
const { AppError } = require('../../shared/errors');

const DEFAULT_INIT_TIMEOUT = 10000;

function createEnginePool(options) {
  const opts = options || {};
  const enginePath = opts.path;
  const engineArgs = opts.args || [];
  const engineEnv = opts.env || null; // доп. переменные окружения для движка
  const initTimeout = opts.initTimeout || DEFAULT_INIT_TIMEOUT;

  let child = null;        // текущий процесс движка
  let ready = null;        // промис готовности (uciok + readyok)
  let lineHandler = null;  // обработчик строк текущей задачи
  let queue = Promise.resolve(); // FIFO: задачи выполняются строго по очереди
  let shuttingDown = false;

  function killEngine() {
    if (child) {
      try { child.kill(); } catch (e) { /* процесс мог уже умереть */ }
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

  // Каждая строка stdout уходит в обработчик текущей задачи (если он есть).
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

      // Падение движка обнуляет состояние — следующий запрос поднимет заново.
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
      ready = null; // чтобы следующий запрос попробовал заново
      throw err;
    });

    return ready;
  }

  // Разбор строки "info ... score cp 25 ... pv e2e4 e7e5"
  function parseInfoLine(line) {
    const tokens = line.split(/\s+/);
    const info = {};
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === 'depth') {
        info.depth = Number(tokens[i + 1]);
      } else if (tokens[i] === 'score') {
        const type = tokens[i + 1]; // cp | mate
        const value = Number(tokens[i + 2]);
        if (type === 'cp' || type === 'mate') info.score = { type, value };
      } else if (tokens[i] === 'pv') {
        info.pv = tokens.slice(i + 1);
        break; // pv всегда последняя секция строки
      }
    }
    return info;
  }

  function runAnalysis(params) {
    return new Promise((resolve, reject) => {
      let best = null;   // последняя info-строка с pv (самая глубокая)
      let settled = false;
      let timer = null;
      let killTimer = null;

      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        // Гасим оба таймера: иначе «добивающий» таймер после stop продолжит
        // держать event loop и задержит остановку процесса.
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
          // "(none)" и "0000" означают, что ходов нет (мат/пат).
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

      // Жёсткий предел: если движок не отдал bestmove — просим остановиться,
      // а если и это не помогло, убиваем процесс, чтобы не заблокировать очередь.
      timer = setTimeout(() => {
        try { send('stop'); } catch (e) { /* процесс уже мёртв */ }
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
    // Ставим задачу в конец очереди — параллельных анализов не бывает.
    const task = queue.then(async () => {
      if (shuttingDown) throw new AppError(503, 'Сервер останавливается');
      await startEngine();
      return runAnalysis(params);
    });
    // Очередь не должна вставать колом из-за упавшей задачи.
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
