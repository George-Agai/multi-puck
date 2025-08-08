import React, { useEffect, useRef, useState, type JSX } from 'react';

type Puck = { x: number; y: number; dx: number; dy: number };
type Score = { you: number; opp: number };

export default function Offline(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const puckRef = useRef<Puck>({ x: 0, y: 0, dx: 3, dy: 3 });
  const paddleRef = useRef<number>(0);
  const opponentRef = useRef<number>(0);
  const paddleWidthRef = useRef<number>(110);
  const speedMultRef = useRef<number>(1);

  const dragTrackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);

  // New match rules
  const ROUNDS_TO_WIN_GAME = 3;
  const MAX_ROUNDS_PER_GAME = 5;

  const PADDLE_HEIGHT = 14;
  const PUCK_SIZE = 12;

  const [rounds, setRounds] = useState<Score>({ you: 0, opp: 0 }); // rounds won in current game
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  function extractClientX(e: any): number {
    const ev = e.nativeEvent ?? e;
    if (ev.touches?.[0]) return ev.touches[0].clientX;
    if (ev.changedTouches?.[0]) return ev.changedTouches[0].clientX;
    if (typeof ev.clientX === 'number') return ev.clientX;
    return 0;
  }

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match the internal resolution to the CSS size
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      paddleWidthRef.current = Math.round(canvas.width * 0.28);
      paddleRef.current = (canvas.width - paddleWidthRef.current) / 2;
      opponentRef.current = paddleRef.current;
      puckRef.current = { x: canvas.width / 2, y: canvas.height / 2, dx: 3, dy: 3 };

      layoutKnobToPaddle();
    }

    resize();
    window.addEventListener('resize', resize);
    startLoop();
    return () => {
      window.removeEventListener('resize', resize);
      stopLoop();
    };
  }, []);

  function startLoop() {
    if (rafRef.current !== null) return;
    const step = () => {
      update();
      draw();
      rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
  }
  function stopLoop() {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function resetRound() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    puckRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 1.2),
      dy: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 1.2),
    };
    speedMultRef.current = 1;
    opponentRef.current = (canvas.width - paddleWidthRef.current) / 2;
    layoutKnobToPaddle();
  }

  function checkRoundWin(nextRounds: Score) {
    // Check win by reaching 3 rounds first
    if (nextRounds.you >= ROUNDS_TO_WIN_GAME || nextRounds.opp >= ROUNDS_TO_WIN_GAME) {
      endGame(nextRounds.you > nextRounds.opp ? 'You' : 'Opponent');
      return;
    }
    // Or check if 5 total rounds have been played
    if (nextRounds.you + nextRounds.opp >= MAX_ROUNDS_PER_GAME) {
      endGame(nextRounds.you > nextRounds.opp ? 'You' : nextRounds.opp > nextRounds.you ? 'Opponent' : 'Tie');
    }
  }

  function endGame(winner: string) {
    setMatchWinner(winner);
    stopLoop();
  }

  function update() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const puck = puckRef.current;
    puck.x += puck.dx * speedMultRef.current;
    puck.y += puck.dy * speedMultRef.current;

    if (puck.x - PUCK_SIZE < 0) {
      puck.x = PUCK_SIZE;
      puck.dx *= -1;
    }
    if (puck.x + PUCK_SIZE > canvas.width) {
      puck.x = canvas.width - PUCK_SIZE;
      puck.dx *= -1;
    }

    const playerTop = canvas.height - 30;
    if (
      puck.y + PUCK_SIZE >= playerTop &&
      puck.y + PUCK_SIZE <= playerTop + 30 &&
      puck.x >= paddleRef.current &&
      puck.x <= paddleRef.current + paddleWidthRef.current
    ) {
      puck.y = playerTop - PUCK_SIZE;
      puck.dy = -Math.abs(puck.dy);
      const rel = (puck.x - (paddleRef.current + paddleWidthRef.current / 2)) / (paddleWidthRef.current / 2);
      puck.dx += rel * 0.6;
      speedMultRef.current *= 1.03;
    }

    const opponentBottom = 30;
    if (
      puck.y - PUCK_SIZE <= opponentBottom &&
      puck.y - PUCK_SIZE >= opponentBottom - 30 &&
      puck.x >= opponentRef.current &&
      puck.x <= opponentRef.current + paddleWidthRef.current
    ) {
      puck.y = opponentBottom + PUCK_SIZE;
      puck.dy = Math.abs(puck.dy);
      const rel = (puck.x - (opponentRef.current + paddleWidthRef.current / 2)) / (paddleWidthRef.current / 2);
      puck.dx += rel * 0.6;
      speedMultRef.current *= 1.03;
    }

    if (puck.y - PUCK_SIZE <= 0) {
      setRounds((prev) => {
        const next = { you: prev.you + 1, opp: prev.opp };
        checkRoundWin(next);
        return next;
      });
      resetRound();
    } else if (puck.y + PUCK_SIZE >= canvas.height) {
      setRounds((prev) => {
        const next = { you: prev.you, opp: prev.opp + 1 };
        checkRoundWin(next);
        return next;
      });
      resetRound();
    }

    const aiSpeed = Math.max(1.6, 4 - speedMultRef.current);
    const target = puck.x - paddleWidthRef.current / 2;
    const diff = target - opponentRef.current;
    opponentRef.current += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
    opponentRef.current = Math.max(0, Math.min(opponentRef.current, canvas.width - paddleWidthRef.current));
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#FFB88C');
    g.addColorStop(0.6, '#FF7A88');
    g.addColorStop(1, '#FFC3A0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFD27F';
    ctx.fillRect(opponentRef.current, 12, paddleWidthRef.current, PADDLE_HEIGHT);

    ctx.fillStyle = '#FFEE93';
    ctx.fillRect(paddleRef.current, canvas.height - 30, paddleWidthRef.current, PADDLE_HEIGHT);

    ctx.beginPath();
    ctx.fillStyle = '#FF3D00';
    const p = puckRef.current;
    ctx.arc(p.x, p.y, PUCK_SIZE, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
  }

  function layoutKnobToPaddle() {
    const canvas = canvasRef.current;
    const track = dragTrackRef.current;
    const knob = knobRef.current;
    if (!canvas || !track || !knob) return;
    const trackRect = track.getBoundingClientRect();
    const knobWidth = knob.offsetWidth;
    const availableTrack = Math.max(1, trackRect.width - knobWidth);
    const denom = Math.max(1, canvas.width - paddleWidthRef.current);
    const ratio = paddleRef.current / denom;
    const knobLeft = ratio * availableTrack;
    knob.style.transform = `translateX(${knobLeft}px)`;
  }

  function handlePointerDown(e: any) {
    draggingRef.current = true;
    document.body.style.userSelect = 'none';
    handlePointerMove(e);
  }
  function handlePointerMove(e: any) {
    if (!draggingRef.current) return;
    const track = dragTrackRef.current;
    const canvas = canvasRef.current;
    const knob = knobRef.current;
    if (!track || !canvas || !knob) return;
    const rect = track.getBoundingClientRect();
    const knobW = knob.offsetWidth;
    const clientX = extractClientX(e);
    const leftClamped = Math.max(0, Math.min(clientX - rect.left - knobW / 2, rect.width - knobW));
    const pct = leftClamped / Math.max(1, rect.width - knobW);
    const paddleX = pct * (canvas.width - paddleWidthRef.current);
    paddleRef.current = Math.max(0, Math.min(paddleX, canvas.width - paddleWidthRef.current));
    knob.style.transform = `translateX(${leftClamped}px)`;
  }
  function handlePointerUp() {
    draggingRef.current = false;
    document.body.style.userSelect = '';
  }

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const track = dragTrackRef.current;
    const knob = knobRef.current;
    const canvas = canvasRef.current;
    if (!track || !knob || !canvas) return;
    const rect = track.getBoundingClientRect();
    const knobW = knob.offsetWidth;
    const left = Math.max(0, Math.min(e.clientX - rect.left - knobW / 2, rect.width - knobW));
    const pct = left / Math.max(1, rect.width - knobW);
    const paddleX = pct * (canvas.width - paddleWidthRef.current);
    paddleRef.current = Math.max(0, Math.min(paddleX, canvas.width - paddleWidthRef.current));
    knob.style.transform = `translateX(${left}px)`;
  }

  function resetMatch() {
    setRounds({ you: 0, opp: 0 });
    setMatchWinner(null);
    resetRound();
    startLoop();
  }

  return (
    <div className="h-[92vh] flex flex-col items-center justify-between pb-2 bg-gradient-to-b from-orange-50 to-pink-50">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between px-1 my-0.5">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-700 text-center">
            <div className="font-semibold">You</div>
            <div className="font-bold text-lg">{rounds.you}</div>
            <div className="text-xs text-gray-500">Rounds</div>
          </div>
          <div className="text-sm text-gray-700 text-center">
            <div className="font-semibold">Opponent</div>
            <div className="font-bold text-lg">{rounds.opp}</div>
            <div className="text-xs text-gray-500">Rounds</div>
          </div>
          <div className="text-sm text-gray-700 text-center">
            <div className="font-semibold">Total</div>
            <div className="font-bold text-lg">{MAX_ROUNDS_PER_GAME}</div>
            <div className="text-xs text-gray-500">Rounds</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center bg-gray-200 w-3 h-3 rounded-full">
            P
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full max-w-md bg-white shadow p-0 flex-shrink">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[65vh] touch-none"
            style={{ display: 'block' }}
          />
          {matchWinner && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 p-4 rounded-lg text-center pointer-events-auto">
                <div className="text-xl font-bold">{matchWinner} won the game!</div>
                <button
                  onClick={resetMatch}
                  className="flex-1 px-3 py-0.5 bg-orange-500 text-white rounded mt-1"
                  type="button"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="w-full max-w-md px-2">
        {/* <div className="text-xs text-gray-600 mb-1">Drag the knob to move your paddle</div> */}
        <div
          ref={dragTrackRef}
          onClick={handleTrackClick}
          className="relative mx-auto bg-white/70 rounded-full p-1"
          style={{ backdropFilter: 'blur(6px)' }}
        >
          <div className="w-full h-2 rounded-full bg-gray-100/60 relative flex items-center">
            <div className="absolute left-1/2 -translate-x-1/2 w-11/12 h-1 rounded-full bg-gradient-to-r from-yellow-200 to-pink-200" />
            <div
              ref={knobRef}
              onPointerDown={(e) => { e.preventDefault(); handlePointerDown(e); }}
              onPointerMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e); }}
              onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
              onTouchEnd={handlePointerUp}
              className="relative z-10 w-4 h-4 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab"
              style={{ touchAction: 'none', transform: 'translateX(0px)', transition: 'transform 0.02s linear' }}
              role="button"
              tabIndex={0}
            >
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-red-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
