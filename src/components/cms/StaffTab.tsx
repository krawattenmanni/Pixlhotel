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
  headerClass: string;
}[] = [
  { key: 'Hotel Managers', title: 'Hotel Management', headerClass: 'habbo-header-red' },
  { key: 'Moderators', title: 'Moderators', headerClass: 'habbo-header-blue' },
  { key: 'Event Team', title: 'Event Team', headerClass: 'habbo-header-orange' },
];

export function StaffTab({ staff, onFollowStaff }: StaffTabProps) {
  return (
    <div className="space-y-5">
      <div className="habbo-box p-3.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center bg-[#f4f8fc]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[#1d4e78]" />
          <div>
            <h1 className="text-[15px] font-bold text-[#111827]">PIXL Hotel Staff Team</h1>
            <p className="text-[11px] text-[#475569]">
              Official PIXL Hotel Management, Safety Moderators, and Event Team hosts — synced live from the PIXL Account Database.
            </p>
          </div>
        </div>
      </div>

      {DEPARTMENTS.map((dept) => {
        const members = staff.filter((m) => m.department === dept.key);

        return (
          <section key={dept.key} className="habbo-box" data-testid={`staff-section-${dept.key}`}>
            <div className={`habbo-box-header flex items-center justify-between ${dept.headerClass}`}>
              <span>{dept.title}</span>
              <span className="font-mono-num text-[11px] text-white/95">{members.length} members</span>
            </div>
            {members.length === 0 ? (
              <div className="p-5 text-center text-[11px] font-bold text-[#64748b]">
                No staff members currently assigned to {dept.title}.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 p-3.5 md:grid-cols-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    data-testid={`staff-card-${member.name}`}
                    className="flex items-center justify-between gap-3.5 rounded-[3px] border border-[#000000] bg-[#f8fafc] p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#cfe7fa] to-[#eef7ff] pb-1 shrink-0">
                        <PixelAvatarCanvas look={member.look} dir={0} pose="stand" scale={1} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[14px] font-bold text-[#111827] truncate">{member.name}</h3>
                          <PixelBadge code={member.badgeCode} label={member.badgeLabel} />
                        </div>
                        <p className="text-[11px] font-bold text-[#1d4e78]">{member.role}</p>
                        <p className="mt-1 text-[11px] italic text-[#475569] truncate">&ldquo;{member.motto}&rdquo;</p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-[1px] border ${
                              member.online
                                ? 'bg-[#22c55e] border-[#14532d]'
                                : 'bg-[#ef4444] border-[#7f1d1d]'
                            }`}
                          />
                          <span className={member.online ? 'text-[#15803d]' : 'text-[#b91c1c]'}>
                            {member.online ? 'Online in Hotel' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {member.online && (
                      <button
                        type="button"
                        onClick={() => onFollowStaff(member.roomId)}
                        className="habbo-btn-green px-3 py-1.5 text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
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
