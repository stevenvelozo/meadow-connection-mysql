-- Chinook music store schema for introspection testing
-- Based on https://github.com/lerocha/chinook-database

USE bookstore;

-- [ Artist ]
CREATE TABLE IF NOT EXISTS
    `Artist`
    (
        `ArtistId` INT NOT NULL AUTO_INCREMENT,
        `Name` NVARCHAR(120),
        CONSTRAINT `PK_Artist` PRIMARY KEY (`ArtistId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Album ]
CREATE TABLE IF NOT EXISTS
    `Album`
    (
        `AlbumId` INT NOT NULL AUTO_INCREMENT,
        `Title` NVARCHAR(160) NOT NULL,
        `ArtistId` INT NOT NULL,
        CONSTRAINT `PK_Album` PRIMARY KEY (`AlbumId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Employee ]
CREATE TABLE IF NOT EXISTS
    `Employee`
    (
        `EmployeeId` INT NOT NULL AUTO_INCREMENT,
        `LastName` NVARCHAR(20) NOT NULL,
        `FirstName` NVARCHAR(20) NOT NULL,
        `Title` NVARCHAR(30),
        `ReportsTo` INT,
        `BirthDate` DATETIME,
        `HireDate` DATETIME,
        `Address` NVARCHAR(70),
        `City` NVARCHAR(40),
        `State` NVARCHAR(40),
        `Country` NVARCHAR(40),
        `PostalCode` NVARCHAR(10),
        `Phone` NVARCHAR(24),
        `Fax` NVARCHAR(24),
        `Email` NVARCHAR(60),
        CONSTRAINT `PK_Employee` PRIMARY KEY (`EmployeeId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Customer ]
CREATE TABLE IF NOT EXISTS
    `Customer`
    (
        `CustomerId` INT NOT NULL AUTO_INCREMENT,
        `FirstName` NVARCHAR(40) NOT NULL,
        `LastName` NVARCHAR(20) NOT NULL,
        `Company` NVARCHAR(80),
        `Address` NVARCHAR(70),
        `City` NVARCHAR(40),
        `State` NVARCHAR(40),
        `Country` NVARCHAR(40),
        `PostalCode` NVARCHAR(10),
        `Phone` NVARCHAR(24),
        `Fax` NVARCHAR(24),
        `Email` NVARCHAR(60) NOT NULL,
        `SupportRepId` INT,
        CONSTRAINT `PK_Customer` PRIMARY KEY (`CustomerId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Genre ]
CREATE TABLE IF NOT EXISTS
    `Genre`
    (
        `GenreId` INT NOT NULL AUTO_INCREMENT,
        `Name` NVARCHAR(120),
        CONSTRAINT `PK_Genre` PRIMARY KEY (`GenreId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ MediaType ]
CREATE TABLE IF NOT EXISTS
    `MediaType`
    (
        `MediaTypeId` INT NOT NULL AUTO_INCREMENT,
        `Name` NVARCHAR(120),
        CONSTRAINT `PK_MediaType` PRIMARY KEY (`MediaTypeId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Playlist ]
CREATE TABLE IF NOT EXISTS
    `Playlist`
    (
        `PlaylistId` INT NOT NULL AUTO_INCREMENT,
        `Name` NVARCHAR(120),
        CONSTRAINT `PK_Playlist` PRIMARY KEY (`PlaylistId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Track ]
CREATE TABLE IF NOT EXISTS
    `Track`
    (
        `TrackId` INT NOT NULL AUTO_INCREMENT,
        `Name` NVARCHAR(200) NOT NULL,
        `AlbumId` INT,
        `MediaTypeId` INT NOT NULL,
        `GenreId` INT,
        `Composer` NVARCHAR(220),
        `Milliseconds` INT NOT NULL,
        `Bytes` INT,
        `UnitPrice` NUMERIC(10,2) NOT NULL,
        CONSTRAINT `PK_Track` PRIMARY KEY (`TrackId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Invoice ]
CREATE TABLE IF NOT EXISTS
    `Invoice`
    (
        `InvoiceId` INT NOT NULL AUTO_INCREMENT,
        `CustomerId` INT NOT NULL,
        `InvoiceDate` DATETIME NOT NULL,
        `BillingAddress` NVARCHAR(70),
        `BillingCity` NVARCHAR(40),
        `BillingState` NVARCHAR(40),
        `BillingCountry` NVARCHAR(40),
        `BillingPostalCode` NVARCHAR(10),
        `Total` NUMERIC(10,2) NOT NULL,
        CONSTRAINT `PK_Invoice` PRIMARY KEY (`InvoiceId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ InvoiceLine ]
CREATE TABLE IF NOT EXISTS
    `InvoiceLine`
    (
        `InvoiceLineId` INT NOT NULL AUTO_INCREMENT,
        `InvoiceId` INT NOT NULL,
        `TrackId` INT NOT NULL,
        `UnitPrice` NUMERIC(10,2) NOT NULL,
        `Quantity` INT NOT NULL,
        CONSTRAINT `PK_InvoiceLine` PRIMARY KEY (`InvoiceLineId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ PlaylistTrack ] (composite PK, no auto-increment)
CREATE TABLE IF NOT EXISTS
    `PlaylistTrack`
    (
        `PlaylistId` INT NOT NULL,
        `TrackId` INT NOT NULL,
        CONSTRAINT `PK_PlaylistTrack` PRIMARY KEY (`PlaylistId`, `TrackId`)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foreign Key Constraints
ALTER TABLE `Album` ADD CONSTRAINT `FK_AlbumArtistId`
    FOREIGN KEY (`ArtistId`) REFERENCES `Artist` (`ArtistId`);

ALTER TABLE `Customer` ADD CONSTRAINT `FK_CustomerSupportRepId`
    FOREIGN KEY (`SupportRepId`) REFERENCES `Employee` (`EmployeeId`);

ALTER TABLE `Employee` ADD CONSTRAINT `FK_EmployeeReportsTo`
    FOREIGN KEY (`ReportsTo`) REFERENCES `Employee` (`EmployeeId`);

ALTER TABLE `Invoice` ADD CONSTRAINT `FK_InvoiceCustomerId`
    FOREIGN KEY (`CustomerId`) REFERENCES `Customer` (`CustomerId`);

ALTER TABLE `InvoiceLine` ADD CONSTRAINT `FK_InvoiceLineInvoiceId`
    FOREIGN KEY (`InvoiceId`) REFERENCES `Invoice` (`InvoiceId`);

ALTER TABLE `InvoiceLine` ADD CONSTRAINT `FK_InvoiceLineTrackId`
    FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`);

ALTER TABLE `PlaylistTrack` ADD CONSTRAINT `FK_PlaylistTrackPlaylistId`
    FOREIGN KEY (`PlaylistId`) REFERENCES `Playlist` (`PlaylistId`);

ALTER TABLE `PlaylistTrack` ADD CONSTRAINT `FK_PlaylistTrackTrackId`
    FOREIGN KEY (`TrackId`) REFERENCES `Track` (`TrackId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackAlbumId`
    FOREIGN KEY (`AlbumId`) REFERENCES `Album` (`AlbumId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackGenreId`
    FOREIGN KEY (`GenreId`) REFERENCES `Genre` (`GenreId`);

ALTER TABLE `Track` ADD CONSTRAINT `FK_TrackMediaTypeId`
    FOREIGN KEY (`MediaTypeId`) REFERENCES `MediaType` (`MediaTypeId`);

-- Indices on foreign key columns (for query performance)
CREATE INDEX `IFK_AlbumArtistId` ON `Album` (`ArtistId`);
CREATE INDEX `IFK_CustomerSupportRepId` ON `Customer` (`SupportRepId`);
CREATE INDEX `IFK_EmployeeReportsTo` ON `Employee` (`ReportsTo`);
CREATE INDEX `IFK_InvoiceCustomerId` ON `Invoice` (`CustomerId`);
CREATE INDEX `IFK_InvoiceLineInvoiceId` ON `InvoiceLine` (`InvoiceId`);
CREATE INDEX `IFK_InvoiceLineTrackId` ON `InvoiceLine` (`TrackId`);
CREATE INDEX `IFK_TrackAlbumId` ON `Track` (`AlbumId`);
CREATE INDEX `IFK_TrackGenreId` ON `Track` (`GenreId`);
CREATE INDEX `IFK_TrackMediaTypeId` ON `Track` (`MediaTypeId`);
