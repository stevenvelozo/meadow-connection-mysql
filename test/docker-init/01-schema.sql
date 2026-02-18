-- Bookstore schema and seed data for meadow-connection-mysql tests

USE bookstore;

-- [ Book ]
CREATE TABLE IF NOT EXISTS
    Book
    (
        IDBook INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDBook CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        CreateDate DATETIME,
        CreatingIDUser INT NOT NULL DEFAULT '0',
        UpdateDate DATETIME,
        UpdatingIDUser INT NOT NULL DEFAULT '0',
        Deleted TINYINT NOT NULL DEFAULT '0',
        DeleteDate DATETIME,
        DeletingIDUser INT NOT NULL DEFAULT '0',
        Title CHAR(200) NOT NULL DEFAULT '',
        Type CHAR(32) NOT NULL DEFAULT '',
        Genre CHAR(128) NOT NULL DEFAULT '',
        ISBN CHAR(64) NOT NULL DEFAULT '',
        Language CHAR(12) NOT NULL DEFAULT '',
        ImageURL CHAR(254) NOT NULL DEFAULT '',
        PublicationYear INT NOT NULL DEFAULT '0',

        PRIMARY KEY (IDBook)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ BookAuthorJoin ]
CREATE TABLE IF NOT EXISTS
    BookAuthorJoin
    (
        IDBookAuthorJoin INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDBookAuthorJoin CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        IDBook INT NOT NULL DEFAULT '0',
        IDAuthor INT NOT NULL DEFAULT '0',

        PRIMARY KEY (IDBookAuthorJoin)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Author ]
CREATE TABLE IF NOT EXISTS
    Author
    (
        IDAuthor INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDAuthor CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        CreateDate DATETIME,
        CreatingIDUser INT NOT NULL DEFAULT '0',
        UpdateDate DATETIME,
        UpdatingIDUser INT NOT NULL DEFAULT '0',
        Deleted TINYINT NOT NULL DEFAULT '0',
        DeleteDate DATETIME,
        DeletingIDUser INT NOT NULL DEFAULT '0',
        Name CHAR(200) NOT NULL DEFAULT '',

        PRIMARY KEY (IDAuthor)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ BookPrice ]
CREATE TABLE IF NOT EXISTS
    BookPrice
    (
        IDBookPrice INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDBookPrice CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        CreateDate DATETIME,
        CreatingIDUser INT NOT NULL DEFAULT '0',
        UpdateDate DATETIME,
        UpdatingIDUser INT NOT NULL DEFAULT '0',
        Deleted TINYINT NOT NULL DEFAULT '0',
        DeleteDate DATETIME,
        DeletingIDUser INT NOT NULL DEFAULT '0',
        Price DECIMAL(8,2),
        StartDate DATETIME,
        EndDate DATETIME,
        Discountable TINYINT NOT NULL DEFAULT '0',
        CouponCode CHAR(16) NOT NULL DEFAULT '',
        IDBook INT NOT NULL DEFAULT '0',

        PRIMARY KEY (IDBookPrice)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- [ Review ]
CREATE TABLE IF NOT EXISTS
    Review
    (
        IDReviews INT UNSIGNED NOT NULL AUTO_INCREMENT,
        GUIDReviews CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        CreateDate DATETIME,
        CreatingIDUser INT NOT NULL DEFAULT '0',
        UpdateDate DATETIME,
        UpdatingIDUser INT NOT NULL DEFAULT '0',
        Deleted TINYINT NOT NULL DEFAULT '0',
        DeleteDate DATETIME,
        DeletingIDUser INT NOT NULL DEFAULT '0',
        Text TEXT,
        Rating INT NOT NULL DEFAULT '0',
        IDBook INT NOT NULL DEFAULT '0',

        PRIMARY KEY (IDReviews)
    ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data: 12 books (tests require at least 10)
INSERT INTO Book (Title, Type, Genre, ISBN, Language, PublicationYear) VALUES
    ('The Hunger Games', 'Paper', 'UNKNOWN', '439023483', 'eng', 2008),
    ('Harry Potter and the Philosopher''s Stone', 'Paper', 'UNKNOWN', '439554934', 'eng', 1997),
    ('Twilight', 'Paper', 'UNKNOWN', '316015849', 'en-US', 2005),
    ('To Kill a Mockingbird', 'Paper', 'UNKNOWN', '61120081', 'eng', 1960),
    ('The Great Gatsby', 'Paper', 'UNKNOWN', '743273567', 'eng', 1925),
    ('The Fault in Our Stars', 'Paper', 'UNKNOWN', '525478817', 'eng', 2012),
    ('The Hobbit', 'Paper', 'UNKNOWN', '618260307', 'en-US', 1937),
    ('The Catcher in the Rye', 'Paper', 'UNKNOWN', '316769177', 'eng', 1951),
    ('Angels & Demons', 'Paper', 'UNKNOWN', '1416524797', 'en-CA', 2000),
    ('Pride and Prejudice', 'Paper', 'UNKNOWN', '679783261', 'eng', 1813),
    ('The Kite Runner', 'Paper', 'UNKNOWN', '1594480001', 'eng', 2003),
    ('Divergent', 'Paper', 'UNKNOWN', '62024035', 'eng', 2011);
