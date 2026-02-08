CREATE TABLE `document_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`medfId` varchar(256) NOT NULL,
	`title` varchar(512) NOT NULL,
	`issuer` varchar(256) NOT NULL,
	`snapshot` varchar(64) NOT NULL,
	`medfJson` text NOT NULL,
	`docHash` varchar(128),
	`ipfsCid` varchar(128),
	`blockCount` int NOT NULL DEFAULT 0,
	`changeSummary` varchar(512),
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_versions_id` PRIMARY KEY(`id`)
);
