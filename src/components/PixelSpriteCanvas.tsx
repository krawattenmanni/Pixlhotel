import { useEffect, useMemo, useRef } from 'react';
import {
  getAvatarHeadSprite,
  getAvatarSprite,
  getBadgeSprite,
  getFurniSprite,
  getItemPreviewImage,
  getPetSprite,
} from '../game/pixelSprites';
import type {
  AvatarPose,
  CustomBadgeDef,
  Direction,
  LookConfig,
  PetAnim,
  PetSpecies,
} from '../game/types';

interface AvatarCanvasProps {
  look: LookConfig;
  dir?: Direction;
  pose?: AvatarPose;
  frame?: number;
  scale?: number;
  swimming?: boolean;
  swimwearColor?: string;
  className?: string;
}

export function PixelAvatarCanvas({
  look,
  dir = 0,
  pose = 'stand',
  frame = 0,
  scale = 2,
  swimming = false,
  swimwearColor = '#0ea5e9',
  className = '',
}: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = 44 * scale;
  const h = 76 * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    const sprite = getAvatarSprite(look, dir, pose, frame, swimming, swimwearColor);
    ctx.drawImage(sprite, 0, 0, w, h);
  }, [look, dir, pose, frame, scale, swimming, swimwearColor, w, h]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      className={`pixelated ${className}`}
      style={{ width: w, height: h }}
    />
  );
}

interface HeadCanvasProps {
  look: LookConfig;
  size?: number;
  className?: string;
}

export function PixelHeadCanvas({ look, size = 36, className = '' }: HeadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const sprite = getAvatarHeadSprite(look);
    ctx.drawImage(sprite, 0, 0, size, size);
  }, [look, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

interface FurniCanvasProps {
  furniId: string;
  dir?: Direction;
  state?: number;
  size?: number;
  className?: string;
}

export function PixelFurniCanvas({
  furniId,
  dir = 0,
  state = 1,
  size = 64,
  className = '',
}: FurniCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const h = Math.round(size * (92 / 72));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, h);
    const sprite = getFurniSprite(furniId, dir, state, 0);
    ctx.drawImage(sprite, 0, 0, size, h);
  }, [furniId, dir, state, size, h]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={h}
      className={`pixelated ${className}`}
      style={{ width: size, height: h }}
    />
  );
}

/**
 * Memoized PNG <img> preview powered by getItemPreviewImage for Catalogue, Inventory, Trading & Housekeeping.
 */
export function FurniPreviewImg({
  itemType,
  alt,
  state = '1',
  size = 56,
  className = '',
}: {
  itemType: string;
  alt?: string;
  state?: string;
  size?: number;
  className?: string;
}) {
  const src = useMemo(() => getItemPreviewImage(itemType, state), [itemType, state]);
  return (
    <img
      src={src}
      alt={alt ?? itemType}
      className={`pixelated object-contain select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

export function PixelPetCanvas({
  species,
  dir = 0,
  anim = 'stand',
  size = 56,
  className = '',
}: {
  species: PetSpecies;
  dir?: Direction;
  anim?: PetAnim;
  size?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const sprite = getPetSprite(species, dir, anim, 0);
    ctx.drawImage(sprite, 0, 0, size, size);
  }, [species, dir, anim, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PixelBadge({
  code,
  label,
}: {
  code: 'HC' | 'ADM' | 'MOD' | 'EVT' | 'VIP' | 'USR' | string;
  label?: string;
}) {
  const colors =
    code === 'ADM'
      ? { bg: '#9e1b1b', border: '#000000', text: '#fef08a' }
      : code === 'MOD'
      ? { bg: '#1d4ed8', border: '#000000', text: '#ffffff' }
      : code === 'EVT'
      ? { bg: '#7c3aed', border: '#000000', text: '#fde047' }
      : code === 'VIP'
      ? { bg: '#0d9488', border: '#000000', text: '#ffffff' }
      : code === 'USR'
      ? { bg: '#64748b', border: '#000000', text: '#ffffff' }
      : { bg: '#eab308', border: '#000000', text: '#1c1917' };

  return (
    <span
      title={label ?? code}
      className="inline-flex items-center justify-center px-1.5 py-0.5 font-pixel text-[9px] leading-none rounded-[2px] border select-none whitespace-nowrap"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {code}
    </span>
  );
}

export function PixelBadgeSprite({
  badgeId,
  unlocked = true,
  size = 40,
  customBadges = [],
  className = '',
}: {
  badgeId: string;
  unlocked?: boolean;
  size?: number;
  customBadges?: CustomBadgeDef[];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const sprite = getBadgeSprite(badgeId, unlocked, customBadges);
    ctx.drawImage(sprite, 0, 0, size, size);
  }, [badgeId, unlocked, size, customBadges]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
