CREATE TABLE `session_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`totalProblems` int NOT NULL DEFAULT 0,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`accuracyRate` int NOT NULL DEFAULT 0,
	`currentDifficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `session_performance` ADD CONSTRAINT `session_performance_sessionId_learning_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `learning_sessions`(`id`) ON DELETE cascade ON UPDATE no action;