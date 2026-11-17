import { ShieldCheck } from 'lucide-react';
import type { StaffMember } from '../../game/types';
import { PixelAvatarCanvas, PixelBadge } from '../PixelSpriteCanvas';

interface StaffTabProps {
  staff: StaffMember[];
  onFollowStaff: (roomId: string) => void;
}

const DEPARTMENTS: {
  key: StaffMember['department'];
  title: string;
  headerBg: string;
}[] = [
  { key: 'Hotel Managers', title: 'Hotel Management', headerBg: 'bg-[#9e1b1b]' },
  { key: 'Moderators', title: 'Moderators', headerBg: 'bg-[#1d4ed8]' },
  { key: 'Event Team', title: 'Event Team', headerBg: 'bg-[#7c3aed]' },
];

export function StaffTab({ staff, onFollowStaff }: StaffTabProps) {
  return (
    <div className="space-y-6">
      <div className="habbo-box p-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center bg-[#f0f9ff]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-[#235c8a]" />
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">PIXL Hotel Staff Team</h1>
            <p className="text-xs text-slate-600">
              Official PIXL Hotel Management, Safety Moderators, and Event Team hosts — synced live from the PIXL Account Database.
            </p>
          </div>
        </div>
      </div>

      {DEPARTMENTS.map((dept) => {
        const members = staff.filter((m) => m.department === dept.key);

        return (
          <section key={dept.key} className="habbo-box" data-testid={`staff-section-${dept.key}`}>
            <div className={`habbo-box-header flex items-center justify-between ${dept.headerBg}`}>
              <span>{dept.title}</span>
              <span className="font-mono-num text-xs text-white/90">{members.length} members</span>
            </div>
            {members.length === 0 ? (
              <div className="p-6 text-center text-xs font-semibold text-slate-500">
                No staff members currently assigned to {dept.title}.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    data-testid={`staff-card-${member.name}`}
                    className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50/70 p-3.5"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-24 w-20 items-end justify-center rounded border border-[#9ec5e6] bg-gradient-to-b from-[#cfe7fa] to-[#eef7ff] pb-1 shrink-0">
                        <PixelAvatarCanvas look={member.look} dir={0} pose="stand" scale={1} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 truncate">{member.name}</h3>
                          <PixelBadge code={member.badgeCode} label={member.badgeLabel} />
                        </div>
                        <p className="text-xs font-bold text-[#235c8a]">{member.role}</p>
                        <p className="mt-1 text-xs italic text-slate-600 truncate">&ldquo;{member.motto}&rdquo;</p>
                        <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-sm border ${
                              member.online
                                ? 'bg-[#22c55e] border-[#14532d]'
                                : 'bg-[#ef4444] border-[#7f1d1d]'
                            }`}
                          />
                          <span className={member.online ? 'text-emerald-700' : 'text-rose-700'}>
                            {member.online ? 'Online in Hotel' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {member.online && (
                      <button
                        type="button"
                        onClick={() => onFollowStaff(member.roomId)}
                        className="habbo-btn-green rounded px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Visit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
