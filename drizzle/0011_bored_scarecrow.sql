ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityProvider` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityStatus` enum('active','disabled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityLastSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `identityDisabledAt` timestamp;
