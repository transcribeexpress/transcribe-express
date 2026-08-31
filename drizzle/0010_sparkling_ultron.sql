ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `workerLeaseOwner` varchar(255);--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `workerLeaseExpiresAt` timestamp;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `workerAttemptCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD COLUMN IF NOT EXISTS `creditsDeductedAt` timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `transcriptions_recovery_idx` ON `transcriptions` (`status`,`workerLeaseExpiresAt`);
