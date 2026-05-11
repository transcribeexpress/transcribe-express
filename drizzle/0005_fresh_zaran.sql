CREATE TABLE `assemblyJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(64) NOT NULL,
	`userId` varchar(255) NOT NULL,
	`uploadId` varchar(128) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalChunks` int NOT NULL,
	`status` enum('pending','assembling','uploading','completed','error') NOT NULL DEFAULT 'pending',
	`transcriptionId` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assemblyJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `assemblyJobs_jobId_unique` UNIQUE(`jobId`)
);
