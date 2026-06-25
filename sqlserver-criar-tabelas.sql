-- Script de Criação de Tabelas no Microsoft SQL Server (T-SQL)
-- Implatec Análise de Custos

-- Criar tabela analyses
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[analyses]') AND type in (N'U'))
BEGIN
    CREATE TABLE analyses (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        name NVARCHAR(255) NULL,
        mes1_name NVARCHAR(255) NULL,
        mes2_name NVARCHAR(255) NULL,
        data NVARCHAR(MAX) NOT NULL,
        CONSTRAINT CK_analyses_data_json CHECK (ISJSON(data) > 0)
    );
END

-- Criar tabela monthly_inventories
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[monthly_inventories]') AND type in (N'U'))
BEGIN
    CREATE TABLE monthly_inventories (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
        month_year NVARCHAR(50) NOT NULL UNIQUE,
        filename NVARCHAR(255) NULL,
        data NVARCHAR(MAX) NOT NULL,
        CONSTRAINT CK_monthly_inventories_data_json CHECK (ISJSON(data) > 0)
    );
END
