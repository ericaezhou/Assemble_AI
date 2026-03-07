'use client';

import { useThemeStore } from '@/store/themeStore';
import { generateEventCoverDataUrl } from '@/utils/eventCover';

interface EventCoverFallbackProps {
  eventName: string;
  className?: string;
}

export default function EventCoverFallback({ eventName, className = 'w-full h-full object-cover' }: EventCoverFallbackProps) {
  const { accent } = useThemeStore();
  const src = generateEventCoverDataUrl(eventName, accent);
  return <img src={src} alt="" className={className} />;
}
