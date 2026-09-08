import type { AuctionRepository } from '../repositories/auction.repository.js';

export async function publishDueAuctions(
  auctionRepository: AuctionRepository,
  now: Date,
): Promise<void> {
  const due = await auctionRepository.findDueForPublish(now);
  for (const auction of due) {
    await auctionRepository.update(auction.id, { status: 'published' });
  }
}

export function startPublishScheduler(
  auctionRepository: AuctionRepository,
  intervalMs: number,
): () => void {
  const timer = setInterval(() => {
    publishDueAuctions(auctionRepository, new Date()).catch((error: unknown) => {
      console.error('Publish scheduler tick failed', error);
    });
  }, intervalMs);

  return () => clearInterval(timer);
}
