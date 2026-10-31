import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import type { MouseEvent } from 'react';
import { toast } from 'sonner';

export function handleExternalLink(event: MouseEvent<HTMLAnchorElement>) {
  const url = event.currentTarget.href;
  if (!/^https?:\/\//i.test(url)) { event.preventDefault(); return; }
  event.stopPropagation();
  if (!Capacitor.isNativePlatform()) return;
  event.preventDefault();
  void Browser.open({ url }).catch(() => toast.error('Could not open link'));
}

export async function shareAppLink(data: { title: string; text: string; url: string }) {
  if (Capacitor.isNativePlatform()) {
    await Share.share(data);
    return;
  }
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share(data); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  await navigator.clipboard.writeText(data.url);
  toast.success('Link copied!');
}