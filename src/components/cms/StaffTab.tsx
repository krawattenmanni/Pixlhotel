import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { CustomBadgeDef, StaffMember } from '../../game/types';
import { BadgeInfoModal } from '../BadgeInfoModal';
import { PixelAvatarCanvas, PixelBadge, PixelBadgeSprite } from '../PixelSpriteCanvas';

interface StaffTabProps {
  staff: StaffMember[];
  customBadges?: CustomBadgeDef[];
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

export function StaffTab({ staff, customBadges = [], onFollowStaff }: StaffTabProps) {
  const [inspectBadgeId, setInspectBadgeId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="habbo-box p-3.5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center bg-[#f4f8fc]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-[#000000] bg-white shrink-0">
            <PixelBadgeSprite badgeId="badge_admin" unlocked size={36} customBadges={customBadges} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-[#111827] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#1d4e78]" />
              PIXL Hotel Staff Team
            </h1>
            <p className="text-[11px] text-[#475569]">
              Official PIXL Hotel Management, Safety Moderators, and Event Team hosts — tap any badge crest to inspect.
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
              <div className="grid grid-cols-1 gap-3.5 p-3.5 md:grid-cols-2 bg-white">
                {members.map((member) => {
                  const primaryBadgeId =
                    member.badgeCode === 'ADM'
                      ? 'badge_admin'
                      : member.badgeCode === 'MOD'
                      ? 'badge_mod'
                      : 'badge_evt';
                  const displayedBadges =
                    member.badges && member.badges.length > 0
                      ? member.badges.slice(0, 4)
                      : [primaryBadgeId];
                  return (
                    <div
                      key={member.id}
                      data-testid={`staff-card-${member.name}`}
                      className="flex items-center justify-between gap-3.5 rounded-[3px] border border-[#000000] bg-[#f8fafc] p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-24 w-20 items-end justify-center rounded-[2px] border border-[#000000] bg-gradient-to-b from-[#6ec2f7] via-[#bae6fd] to-[#e6dcc6] pb-1 shrink-0">
                          <PixelAvatarCanvas look={member.look} dir={0} pose="stand" scale={1} />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-[14px] font-bold text-[#111827] truncate">
                              {member.name}
                            </h3>
                            <PixelBadge code={member.badgeCode} label={member.badgeLabel} />
                          </div>
                          <p className="text-[11px] font-bold text-[#1d4e78]">{member.role}</p>
                          <p className="text-[11px] italic text-[#475569] truncate">
                            &ldquo;{member.motto}&rdquo;
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {displayedBadges.map((bId) => (
                              <button
                                key={bId}
                                type="button"
                                onClick={() => setInspectBadgeId(bId)}
                                title="Click to inspect badge"
                                className="rounded-[2px] border border-[#cbd5e1] bg-white p-0.5 hover:border-[#000000] cursor-pointer"
                              >
                                <PixelBadgeSprite
                                  badgeId={bId}
                                  unlocked
                                  size={26}
                                  customBadges={customBadges}
                                />
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold pt-0.5">
                            <span
                              className={`inline-block h-2 w-2 rounded-[1px] border ${
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
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <BadgeInfoModal
        badgeId={inspectBadgeId}
        unlocked
        customBadges={customBadges}
        onClose={() => setInspectBadgeId(null)}
      />
    </div>
  );
}
