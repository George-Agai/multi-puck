import React, { useEffect, useRef, useState, type JSX } from 'react';
import canvasBg from '../assets/backgroundImages/canvas-bg.webp';
import scoresBg from '../assets/backgroundImages/score-bg.webp';

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
  const [roundCountdown, setRoundCountdown] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState(1);

  // Pause-emoji state
  const [pauseEmoji, setPauseEmoji] = useState<{ side: 'you' | 'opp'; x: number; y: number } | null>(
    null
  );

  // refs to keep latest values for use in RAF / async code
  const roundsRef = useRef<Score>({ you: 0, opp: 0 });
  useEffect(() => {
    roundsRef.current = rounds;
  }, [rounds]);

  const currentRoundRef = useRef<number>(1);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);

  const matchWinnerRef = useRef<string | null>(null);
  useEffect(() => {
    matchWinnerRef.current = matchWinner;
  }, [matchWinner]);

  const countdownIntervalRef = useRef<number | null>(null);
  const handlingRoundEndRef = useRef<boolean>(false);

  function extractClientX(e: any): number {
    const ev = e.nativeEvent ?? e;
    if (ev.touches?.[0]) return ev.touches[0].clientX;
    if (ev.changedTouches?.[0]) return ev.changedTouches[0].clientX;
    if (typeof ev.clientX === 'number') return ev.clientX;
    return 0;
  }

  // startRoundCountdown shows Round 1 countdown on initial mount or after Play Again
  function startRoundCountdown(roundNum: number) {
    // If match already finished, don't show countdown
    if (matchWinnerRef.current) return;

    stopLoop(); // pause game updates

    // Clear existing interval if any
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setCurrentRound(roundNum);
    let count = 3;
    setRoundCountdown(count);

    countdownIntervalRef.current = window.setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownIntervalRef.current !== null) {
          window.clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setRoundCountdown(null);
        // start the game loop after countdown finishes
        startLoop();
      } else {
        setRoundCountdown(count);
      }
    }, 1000);
  }

  // Start Round 1 when game begins or when Play Again clears matchWinner & rounds
  useEffect(() => {
    // If matchWinner is null and rounds are cleared and we're on round 1, trigger countdown.
    // This is Option 1 approach — it ensures React state updates settle before we start countdown.
    if (matchWinner === null && rounds.you === 0 && rounds.opp === 0 && currentRound === 1) {
      // Avoid re-triggering if a countdown is already active
      if (roundCountdown === null) startRoundCountdown(1);
    }
    // We intentionally do NOT put roundCountdown in the deps to avoid doubling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchWinner, rounds.you, rounds.opp, currentRound]);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match the internal resolution to the CSS size (fixes oval puck)
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

    // do not call startRoundCountdown here (we rely on the effect above)
    return () => {
      window.removeEventListener('resize', resize);
      stopLoop();
      if (countdownIntervalRef.current !== null) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // checkRoundWin returns true if the game ended
  function checkRoundWin(nextRounds: Score): boolean {
    // Check win by reaching 3 rounds first
    if (nextRounds.you >= ROUNDS_TO_WIN_GAME || nextRounds.opp >= ROUNDS_TO_WIN_GAME) {
      endGame(nextRounds.you > nextRounds.opp ? 'You' : 'Opponent');
      return true;
    }
    // Or check if 5 total rounds have been played
    if (nextRounds.you + nextRounds.opp >= MAX_ROUNDS_PER_GAME) {
      endGame(nextRounds.you > nextRounds.opp ? 'You' : nextRounds.opp > nextRounds.you ? 'Opponent' : 'Tie');
      return true;
    }
    return false;
  }

  function endGame(winner: string) {
    setMatchWinner(winner);
    // ensure game paused
    stopLoop();
    // clear countdown if any
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRoundCountdown(null);
    // also clear any pause emoji
    setPauseEmoji(null);
  }

  // handleRoundEnd manages the 2s emoji pause and continuation of the game
  async function handleRoundEnd(side: 'you' | 'opp') {
    // Prevent handling if game is already over
    if (matchWinnerRef.current) return;

    // avoid double-handling
    if (handlingRoundEndRef.current) return;
    handlingRoundEndRef.current = true;

    stopLoop();
    const canvas = canvasRef.current;
    const puck = puckRef.current;
    if (!canvas) {
      handlingRoundEndRef.current = false;
      return;
    }

    // compute next rounds using the latest roundsRef for consistent value
    const prevRounds = roundsRef.current;
    const nextRounds: Score =
      side === 'you' ? { you: prevRounds.you + 1, opp: prevRounds.opp } : { you: prevRounds.you, opp: prevRounds.opp + 1 };

    // update rounds state and increment currentRound
    setRounds(nextRounds);
    setCurrentRound((r) => Math.min(r + 1, MAX_ROUNDS_PER_GAME));

    // check if game ended synchronously (we set matchWinner inside checkRoundWin)
    const ended = checkRoundWin(nextRounds);
    if (ended) {
      handlingRoundEndRef.current = false;
      return; // no emoji if the game ended
    }

    // Show emoji at the side it went out (clamped within canvas)
    const x = Math.max(12, Math.min(puck.x, canvas.width - 12));
    const y = side === 'you' ? 20 : canvas.height - 34; // place slightly inside the canvas
    setPauseEmoji({ side, x, y });

    // Pause visually for 2 seconds
    await new Promise((res) => setTimeout(res, 2000));

    // hide emoji, reset puck and resume
    setPauseEmoji(null);
    resetRound();
    startLoop();

    handlingRoundEndRef.current = false;
  }

  function update() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const puck = puckRef.current;
    puck.x += puck.dx * speedMultRef.current;
    puck.y += puck.dy * speedMultRef.current;

    // horizontal walls
    if (puck.x - PUCK_SIZE < 0) {
      puck.x = PUCK_SIZE;
      puck.dx *= -1;
    }
    if (puck.x + PUCK_SIZE > canvas.width) {
      puck.x = canvas.width - PUCK_SIZE;
      puck.dx *= -1;
    }

    // paddle collision bottom (player)
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

    // paddle collision top (opponent)
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

    // SCORE: puck through top => player wins a round (you)
    if (puck.y - PUCK_SIZE <= 0) {
      // call the handler that pauses and shows emoji
      handleRoundEnd('you');
      return;
    } else if (puck.y + PUCK_SIZE >= canvas.height) {
      // opponent wins the round
      handleRoundEnd('opp');
      return;
    }

    // AI: simple follow puck with a cap
    const aiSpeed = Math.max(3, 9 - speedMultRef.current);
    const target = puck.x - paddleWidthRef.current / 2;
    const diff = target - opponentRef.current;
    opponentRef.current += Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed);
    // clamp
    opponentRef.current = Math.max(0, Math.min(opponentRef.current, canvas.width - paddleWidthRef.current));
  }

  const bgImage = new Image();
  bgImage.src = canvasBg;

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image (cover)
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // opponent paddle (top)
    ctx.fillStyle = '#FFD27F';
    ctx.fillRect(opponentRef.current, 12, paddleWidthRef.current, PADDLE_HEIGHT);

    // player paddle (bottom)
    ctx.fillStyle = '#FFEE93';
    ctx.fillRect(paddleRef.current, canvas.height - 30, paddleWidthRef.current, PADDLE_HEIGHT);

    // puck
    ctx.beginPath();
    ctx.fillStyle = '#FF3D00';
    const p = puckRef.current;
    ctx.arc(p.x, p.y, PUCK_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // center line
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);

    // center circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2); // radius = 20
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();
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

  // Reset match: clear rounds and matchWinner. We rely on the effect
  // watching matchWinner/rounds to start the initial Round 1 countdown.
  function resetMatch() {
    setRounds({ you: 0, opp: 0 });
    setMatchWinner(null);
    setCurrentRound(1);
    resetRound(); // center puck + set dx/dy for when loop starts
    // Do NOT call startRoundCountdown directly here (Option 1 approach).

    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match the internal resolution to the CSS size (fixes oval puck)
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
  }

  return (
    <div className="h-[92vh] flex flex-col items-center justify-start pb-2 bg-gradient-to-b from-orange-50 to-pink-50">
      {/* Header */}
      <div className="w-full max-w-md flex items-center bg-cover bg-center justify-between px-1 py-0.5"
      style={{ backgroundImage: `url(${scoresBg})` }}
      >
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-700 text-center">
            <div className="font-light">You</div>
            <div className="font-bold text-5xl">{rounds.you}</div>
            <div className="text-xs text-gray-500" style={{ marginTop: '-8px' }}>Rounds</div>
          </div>
          <div className="text-sm text-gray-700 text-center">
            <div className="font-light">Opponent</div>
            <div className="font-bold text-5xl">{rounds.opp}</div>
            <div className="text-xs text-gray-500" style={{ marginTop: '-8px' }}>Rounds</div>
          </div>
          <div className="text-sm text-gray-700 text-center">
            <div className="font-light">Total</div>
            <div className="font-bold text-5xl">{MAX_ROUNDS_PER_GAME}</div>
            <div className="text-xs text-gray-500" style={{ marginTop: '-8px' }}>Rounds</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center bg-gray-200 w-3 h-3 rounded-full">
            P
          </div>
        </div>
      </div>

      {roundCountdown !== null && !matchWinner && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-white z-50">
          <div className="text-2xl font-bold mb-2">Round {currentRound}</div>
          <div className="text-5xl font-extrabold">{roundCountdown}</div>
        </div>
      )}

      {/* Canvas */}
      <div className="w-full max-w-md bg-white shadow p-0 flex-shrink border-t border-b border-black/40">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[65vh] touch-none bg-cover bg-center "
            style={{ display: 'block', backgroundImage: `url(${canvasBg})` }}
          />
          {/* Pause emoji overlay (appears near the puck exit) */}
          {pauseEmoji && !matchWinner && (
            <div
              style={{
                position: 'absolute',
                left: `${pauseEmoji.x - 12}px`,
                top: `${pauseEmoji.y - 12}px`,
                pointerEvents: 'none',
              }}
              className="z-50 text-2xl select-none"
            >
              😂
            </div>
          )}

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
      <div className="w-full max-w-md px-2 mt-1">
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
