ALTER TABLE `transcriptions` MODIFY COLUMN `status` enum('pending','processing','completed','error','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `transcriptions` ADD `processingStep` varchar(50);--> statement-breakpoint
ALTER TABLE `transcriptions` ADD `processingProgress` int DEFAULT 0;