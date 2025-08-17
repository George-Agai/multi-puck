import React, { useEffect, useRef, useState, type JSX } from 'react';
import { io, Socket } from 'socket.io-client';
import canvasBg from '../assets/backgroundImages/canvas-bg.webp';
import scoresBg from '../assets/backgroundImages/score-bg.webp';

type Puck = { x: number; y: number; dx: number; dy: number };
type Score = { you: number; opp: number };
type Role = 'host' | 'guest';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

export default function Online(): JSX.Element {
    // ---- original core refs/state (copied from your offline) ----
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

    const ROUNDS_TO_WIN_GAME = 3;
    const MAX_ROUNDS_PER_GAME = 5;

    const PADDLE_HEIGHT = 14;
    const PUCK_SIZE = 12;

    const [rounds, setRounds] = useState<Score>({ you: 0, opp: 0 });
    const [matchWinner, setMatchWinner] = useState<string | null>(null);
    const [roundCountdown, setRoundCountdown] = useState<number | null>(3);
    const [currentRound, setCurrentRound] = useState(1);
    const [waitingForGuest, setWaitingForGuest] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [pauseEmoji, setPauseEmoji] = useState<{ side: 'you' | 'opp'; x: number; y: number } | null>(null);

    // ---- networking ----
    const socketRef = useRef<Socket | null>(null);
    const roleRef = useRef<Role>('host'); // set after join
    const roomIdRef = useRef<string>('');
    const opponentPaddleXRef = useRef<number>(0); // raw from network (host uses this as top paddle)
    const lastStateTimeRef = useRef<number>(0);   // for interpolation on guest
    const roundsRef = useRef<Score>({ you: 0, opp: 0 });
    const currentRoundRef = useRef<number>(1);
    const pauseEmojiRef = useRef<typeof pauseEmoji>(null);
    const matchWinnerRef = useRef<string | null>(null);

    useEffect(() => { roundsRef.current = rounds; }, [rounds]);
    useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
    useEffect(() => { pauseEmojiRef.current = pauseEmoji; }, [pauseEmoji]);
    useEffect(() => { matchWinnerRef.current = matchWinner; }, [matchWinner]);

    // Helper: get/create roomId from URL (?room=xxx)
    function getRoomId(): string {
        const url = new URL(window.location.href);
        const q = url.searchParams.get('room');
        if (q) return q;
        const id = Math.random().toString(36).slice(2, 8);
        url.searchParams.set('room', id);
        window.history.replaceState(null, '', url.toString());
        return id;
    }

    // Extract pointer x (kept from offline)
    function extractClientX(e: any): number {
        const ev = e.nativeEvent ?? e;
        if (ev.touches?.[0]) return ev.touches[0].clientX;
        if (ev.changedTouches?.[0]) return ev.changedTouches[0].clientX;
        if (typeof ev.clientX === 'number') return ev.clientX;
        return 0;
    }

    // Countdown only at game start (same behavior as your latest) :contentReference[oaicite:1]{index=1}
    function startRoundCountdown(roundNum: number) {
        // console.log("Winner in start countdown", matchWinner)
        // console.log("WinnerRef in start countdown", matchWinnerRef.current)

        // if (matchWinner) return;/
        if (matchWinnerRef.current) return;
        stopLoop();
        setCurrentRound(roundNum);
        let c = 3;
        setRoundCountdown(c);
        const id = window.setInterval(() => {
            c -= 1;
            if (c <= 0) {
                window.clearInterval(id);
                setRoundCountdown(null);
                startLoop();
            } else {
                setRoundCountdown(c);
            }
        }, 1000);
    }

    // Resize (match your offline; keeps canvas aspect so puck stays round) :contentReference[oaicite:2]{index=2}
    useEffect(() => {
        function resize() {
            const canvas = canvasRef.current;
            if (!canvas) return;
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
        return () => window.removeEventListener('resize', resize);
    }, []);



    // Networking: connect + join room
    useEffect(() => {
        const roomId = getRoomId();
        roomIdRef.current = roomId;

        const socket = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('join', { roomId });
        });

        socket.on('role', ({ role }: { role: Role }) => {
            roleRef.current = role;
            // reset baseline
            setRounds({ you: 0, opp: 0 });
            setMatchWinner(null);
            setCurrentRound(1);
            resetRound();

            if (role === 'host') {
                // Host waits for guest BEFORE starting countdown
                setWaitingForGuest(true);
                // Do NOT call startRoundCountdown here
            } else {
                // Guest just waits for host broadcast; no countdown here either
            }
        });

        socket.on('opponent:joined', () => {
            console.log("Current role-->", roleRef.current)
            setWaitingForGuest(false);
            if (roleRef.current === 'host') {
                setWaitingForGuest(false);
                setToast('Guest joined');
                setTimeout(() => startRoundCountdown(1), 2000);
                setTimeout(() => setToast(null), 1500);
            }
            else if (roleRef.current === 'guest') {
                setWaitingForGuest(false);
                setToast('You joined');
                setTimeout(() => startRoundCountdown(1), 2000);
                setTimeout(() => setToast(null), 1500);
            }
            // setWaitingForGuest(false);
        });

        socket.on('paddle', (payload: any) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const maxX = Math.max(1, canvas.width - paddleWidthRef.current);

            // Prefer normalized percent; fall back to pixels if a legacy client/server emits it
            let pct: number | null = null;

            if (typeof payload?.paddlePct === 'number' && isFinite(payload.paddlePct)) {
                pct = Math.max(0, Math.min(1, payload.paddlePct));
            } else if (typeof payload?.paddleX === 'number' && isFinite(payload.paddleX)) {
                // legacy support
                pct = Math.max(0, Math.min(1, payload.paddleX / maxX));
            }

            if (pct === null) return; // ignore malformed payloads

            opponentPaddleXRef.current = pct * maxX;
        });


        socket.on('state', (state) => {
            if (roleRef.current !== 'guest') return;
            const canvas = canvasRef.current;
            if (!canvas) return;

            const { puck, hostPaddlePct, paddleWPct, rounds: r, pauseEmoji: pe } = state;
            const W = canvas.width, H = canvas.height;

            // Keep paddle width ratio consistent with host (optional but helps uniformity)
            paddleWidthRef.current = Math.max(10, paddleWPct * W);

            // Scale normalized puck position & velocity back to canvas size
            puckRef.current.x = puck.x * W;
            puckRef.current.y = H - (puck.y * H); // mirror Y
            puckRef.current.dx = puck.dx * W;
            puckRef.current.dy = -(puck.dy * H);

            // opponent paddle (host's bottom -> my top)
            opponentRef.current = hostPaddlePct * (W - paddleWPct * W);
            paddleWidthRef.current = paddleWPct * W;

            // rounds (swap so labels remain 'You/Opponent' correctly)
            setRounds({ you: r.opp, opp: r.you });

            // emoji mirrored & denormalized
            if (pe) {
                setPauseEmoji({
                    side: pe.side === 'you' ? 'opp' : 'you',
                    x: pe.x * W,
                    y: (1 - pe.y) * H,
                });
            } else {
                setPauseEmoji(null);
            }

            lastStateTimeRef.current = performance.now();
        });


        socket.on('roundEnd', ({ rounds: r, currentRound: cr }) => {
            if (roleRef.current === 'guest') {
                // swap for guest view
                setRounds({ you: r.opp, opp: r.you });
                setCurrentRound(cr);
            } else {
                setRounds(r);
                setCurrentRound(cr);
            }
        });

        socket.on('matchEnd', ({ winner }) => {
            setMatchWinner(roleRef.current === 'guest'
                ? (winner === 'You' ? 'Opponent' : winner === 'Opponent' ? 'You' : winner)
                : winner);
            stopLoop();
            setPauseEmoji(null);
        });

        socket.on('playAgain', () => {
            resetMatch();
        });

        socket.on('opponent:left', () => {
            setMatchWinner('Opponent left');
            stopLoop();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    function startLoop() {
        if (rafRef.current !== null) return;
        const step = () => {
            if (roleRef.current === 'host') {
                updateHost();
                broadcastState();
            }
            draw();

            // Only schedule another frame if we didn't stop during this tick
            if (rafRef.current !== null) {
                rafRef.current = window.requestAnimationFrame(step);
            }
        };
        rafRef.current = window.requestAnimationFrame(step);
    }
    function stopLoop() {
        if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }

    // Host simulates physics; guest only draws received state
    function updateHost() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const puck = puckRef.current;
        puck.x += puck.dx * speedMultRef.current;
        puck.y += puck.dy * speedMultRef.current;

        // walls
        if (puck.x - PUCK_SIZE < 0) { puck.x = PUCK_SIZE; puck.dx *= -1; }
        if (puck.x + PUCK_SIZE > canvas.width) { puck.x = canvas.width - PUCK_SIZE; puck.dx *= -1; }

        // bottom paddle (host's bottom is "you" for host)
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

        // top paddle (guest)
        const opponentBottom = 30;
        const oppX = Math.max(0, Math.min(opponentPaddleXRef.current, canvas.width - paddleWidthRef.current));
        opponentRef.current = oppX;

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

        // score (host decides)
        if (puck.y - PUCK_SIZE <= 0) {
            handleRoundEndHost('you');
        } else if (puck.y + PUCK_SIZE >= canvas.height) {
            handleRoundEndHost('opp');
        }
    }

    function broadcastState() {
        const socket = socketRef.current;
        const canvas = canvasRef.current;
        if (!socket || !canvas) return;

        const W = canvas.width, H = canvas.height;
        const p = puckRef.current;

        socket.emit('state', {
            roomId: roomIdRef.current,
            state: {
                // normalized puck position & velocity
                puck: {
                    x: p.x / W,
                    y: p.y / H,
                    dx: p.dx / W,
                    dy: p.dy / H
                },
                // paddles normalized
                hostPaddlePct: paddleRef.current / Math.max(1, W - paddleWidthRef.current),
                paddleWPct: paddleWidthRef.current / W,
                // rounds,
                rounds: roundsRef.current,
                pauseEmoji: pauseEmojiRef.current
                    ? { side: pauseEmojiRef.current.side, x: pauseEmojiRef.current.x / W, y: pauseEmojiRef.current.y / H }
                    : null,
            },
        });
    }





    function endGameHost(winner: string) {
        setMatchWinner(winner);
        stopLoop();
        setPauseEmoji(null);
        socketRef.current?.emit('matchEnd', { roomId: roomIdRef.current, payload: { winner } });
    }

    function handleRoundEndHost(side: 'you' | 'opp') {
        // if (matchWinner) return;
        if (matchWinnerRef.current) return;  // <-- use ref
        stopLoop();
        const canvas = canvasRef.current!;
        const puck = puckRef.current;

        // Use ref to avoid stale closure, then sync state + ref
        const base = roundsRef.current;
        const nextRounds: Score =
            side === 'you'
                ? { you: base.you + 1, opp: base.opp }
                : { you: base.you, opp: base.opp + 1 };
        setRounds(nextRounds);
        roundsRef.current = nextRounds;

        // win check
        if (nextRounds.you >= ROUNDS_TO_WIN_GAME || nextRounds.opp >= ROUNDS_TO_WIN_GAME ||
            nextRounds.you + nextRounds.opp >= MAX_ROUNDS_PER_GAME) {
            endGameHost(nextRounds.you > nextRounds.opp ? 'You' : nextRounds.opp > nextRounds.you ? 'Opponent' : 'Tie');
            return;
        }

        // emoji pause 2s where it went out (host only)
        const x = Math.max(12, Math.min(puck.x, canvas.width - 12));
        const y = side === 'you' ? 20 : canvas.height - 34;
        const emoji = { side, x, y };

        setPauseEmoji(emoji);
        pauseEmojiRef.current = emoji; // <--- make it persist for broadcast


        // Immediately deliver a single snapshot so guest sees the static pause icon during the pause.
        const W = canvas.width, H = canvas.height;
        socketRef.current?.emit('state', {
            roomId: roomIdRef.current,
            state: {
                puck: { x: puck.x / W, y: puck.y / H, dx: puck.dx / W, dy: puck.dy / H },
                hostPaddlePct: paddleRef.current / Math.max(1, W - paddleWidthRef.current),
                paddleWPct: paddleWidthRef.current / W,
                rounds: nextRounds,
                pauseEmoji: { side, x: x / W, y: y / H },
            },
        });

        setTimeout(() => {
            setPauseEmoji(null);
            pauseEmojiRef.current = null; // <--- clear after pause

            const nextRoundNo = Math.min(currentRoundRef.current + 1, MAX_ROUNDS_PER_GAME);
            setCurrentRound(nextRoundNo);
            resetRound();
            socketRef.current?.emit('roundEnd', { roomId: roomIdRef.current, payload: { rounds: nextRounds, currentRound: nextRoundNo } });
            startLoop();
        }, 2000);
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

    // ---- Your draw (kept intact, just removes AI) + background image ---- :contentReference[oaicite:3]{index=3}
    const bgImage = new Image();
    bgImage.src = canvasBg;

    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // opponent top
        ctx.fillStyle = '#FFD27F';
        ctx.fillRect(opponentRef.current, 12, paddleWidthRef.current, PADDLE_HEIGHT);

        // you bottom
        ctx.fillStyle = '#FFEE93';
        ctx.fillRect(paddleRef.current, canvas.height - 30, paddleWidthRef.current, PADDLE_HEIGHT);

        // puck
        ctx.beginPath();
        ctx.fillStyle = '#BFCA28';
        const p = puckRef.current;
        ctx.arc(p.x, p.y, PUCK_SIZE, 0, Math.PI * 2);
        ctx.fill();

        // center line + circle
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // ---- Slider (unchanged) -> send my paddleX to opponent ---- :contentReference[oaicite:4]{index=4}
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

    function emitPaddleNormalized() {
        const socket = socketRef.current;
        const canvas = canvasRef.current;
        if (!socket || !canvas) return;

        const maxX = Math.max(1, canvas.width - paddleWidthRef.current);
        const pct = Math.max(0, Math.min(1, paddleRef.current / maxX)); // 0..1

        socket.emit('paddle', {
            roomId: roomIdRef.current,
            paddlePct: pct,
        });
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
        emitPaddleNormalized();
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
        emitPaddleNormalized();
    }

    function resetMatch() {
        setRounds({ you: 0, opp: 0 });
        setMatchWinner(null);
        matchWinnerRef.current = null;
        setCurrentRound(1);
        resetRound();
        startRoundCountdown(1);
    }

    return (
        <div className="h-[92vh] flex flex-col items-center justify-start pb-2 bg-gradient-to-b from-orange-50 to-orange-200">
            <div
                className="w-full max-w-md flex items-center bg-cover bg-center justify-between px-1 py-0.5"
                style={{ backgroundImage: `url(${scoresBg})` }}
            >
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-700 text-center">
                        <div className="font-light">You - {roleRef.current}</div>
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

                {/* two overlapping profile circles */}
                <div className="relative w-5 h-5 flex items-center justify-center">
                    {/* bottom (opponent) */}
                    <div className="absolute left-0.5 w-2.5 h-2.5 rounded-full border border-black/30 bg-gray-200 flex items-center justify-center text-[10px]">O</div>
                    {/* top (you) slightly overlapping */}
                    <div className="absolute left-2 w-2.5 h-2.5 rounded-full border border-black/40 bg-gray-100 flex items-center justify-center text-[10px] font-semibold z-10">Y</div>
                </div>
            </div>

            {roundCountdown !== null && !matchWinner && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white z-50">
                    <div className="text-3xl font-bold mb-1">Game Starts</div>
                    <div className="text-5xl font-extrabold">{roundCountdown}</div>
                </div>
            )}

            {/* Waiting overlay (host only, before guest joins) */}
            {waitingForGuest && !matchWinner && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div className="px-3 py-2 rounded-lg bg-black/50 text-white text-sm">
                        Waiting for guest to join…
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
                    <div className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-sm shadow">
                        {toast}
                    </div>
                </div>
            )}


            {/* Canvas (same sizes/classes as your file) */} {/* :contentReference[oaicite:6]{index=6} */}
            <div className="w-full max-w-md bg-white shadow p-0 flex-shrink border-t border-b border-black/40">
                <div className="relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-[65vh] touch-none bg-cover bg-center"
                        style={{ display: 'block', backgroundImage: `url(${canvasBg})` }}
                    />

                    {/* Pause emoji overlay */}
                    {pauseEmoji && !matchWinner && (
                        <div
                            style={{ position: 'absolute', left: `${pauseEmoji.x - 12}px`, top: `${pauseEmoji.y - 12}px`, pointerEvents: 'none' }}
                            className="z-50 text-2xl select-none"
                        >
                            😂
                        </div>
                    )}

                    {matchWinner && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white/90 p-4 rounded-lg text-center pointer-events-auto">
                                <div className="text-xl font-bold">{matchWinner} {matchWinner === 'Opponent left' ? null : 'won the game!'}</div>
                                <button
                                    onClick={() => {
                                        resetMatch();
                                        socketRef.current?.emit('playAgain', { roomId: roomIdRef.current });
                                    }}
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

            {/* Slider (unchanged) */} {/* :contentReference[oaicite:7]{index=7} */}
            <div className="w-full max-w-md px-2 mt-1">
                <div className="text-xs text-gray-600 text-center">Drag the knob to move your paddle</div>
                <div
                    ref={dragTrackRef}
                    onClick={handleTrackClick}
                    className="relative mx-auto bg-transparent rounded-full p-1"
                    style={{ backdropFilter: 'blur(6px)' }}
                >
                    <div className="w-full h-2 rounded-full bg-gray-200/70 border border-black/20 relative flex items-center">
                        <div className="absolute left-1/2 -translate-x-1/2 w-11/12 h-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)] rounded-full bg-gradient-to-r from-orange-300 to-blue-200" />
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
                            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
