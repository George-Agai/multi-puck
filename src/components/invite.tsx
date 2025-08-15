// src/components/InviteFriend.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './button';

function ensureRoomIdFromUrlOrNew(location: Location): string {
  const url = new URL(location.href);
  const existing = url.searchParams.get('room');
  return existing || Math.random().toString(36).slice(2, 8);
}

export default function InviteFriend() {
  const navigate = useNavigate();
  const location = window.location;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const roomId = useMemo(() => ensureRoomIdFromUrlOrNew(location), [location.href]);
  const inviteUrl = `${location.origin}/online?room=${roomId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function goPlay() {
    navigate(`/online?room=${roomId}`);
  }

  return (
    <div>
      {/* Trigger */}
      <Button onClick={() => setOpen(true)} buttonText="Invite Friend"/>

      {/* Popup */}
      {open && (
        <div className="fixed inset-0 z-50 -mt-10 flex items-center justify-center bg-black/40">
          <div className="w-[92%] max-w-md bg-white rounded-2xl p-4 shadow-xl flex flex-col items-center">
            <div className="text-lg font-bold mb-2">Invite to Play</div>

            <div className="flex items-stretch gap-1">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-2 py-1 rounded-lg border border-black/20 bg-gray-50 text-sm"
              />
              <button
                onClick={copyLink}
                className="px-2 py-1 rounded-lg border border-black/30 bg-orange-300 hover:bg-orange-200 font-semibold"
                type="button"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center justify-end gap-1 mt-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-black/20 bg-white hover:bg-gray-50"
                type="button"
              >
                Close
              </button>
              <button
                onClick={goPlay}
                className="px-4 py-1.5 rounded-lg border-b-4 border border-black/40 border-b-black font-bold bg-orange-400 hover:bg-orange-300"
                type="button"
              >
                Play
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Room: <span className="font-mono">{roomId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
