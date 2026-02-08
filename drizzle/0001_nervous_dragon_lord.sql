CREATE TABLE `blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`blockId` varchar(256) NOT NULL,
	`role` varchar(64) NOT NULL,
	`format` varchar(32) NOT NULL DEFAULT 'markdown',
	`textContent` text NOT NULL,
	`blockHash` varchar(128),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`blockId` varchar(256),
	`parentId` int,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`citation` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medfId` varchar(256) NOT NULL,
	`medfVersion` varchar(16) NOT NULL DEFAULT '0.2.1',
	`title` varchar(512) NOT NULL,
	`issuer` varchar(256) NOT NULL,
	`documentType` varchar(64),
	`snapshot` varchar(64) NOT NULL,
	`language` varchar(8) DEFAULT 'ja',
	`medfJson` text NOT NULL,
	`docHash` varchar(128),
	`ipfsCid` varchar(128),
	`userId` int NOT NULL,
	`blockCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doc_references` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceDocId` int NOT NULL,
	`sourceBlockId` varchar(256),
	`targetMedfId` varchar(256) NOT NULL,
	`targetBlockId` varchar(256),
	`citation` varchar(512) NOT NULL,
	`resolved` int NOT NULL DEFAULT 0,
	`targetDocId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doc_references_id` PRIMARY KEY(`id`)
);
