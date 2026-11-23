

IF DB_ID(N'SistemaTurnosDB') IS NULL
    CREATE DATABASE SistemaTurnosDB;
GO

USE SistemaTurnosDB;
GO


IF OBJECT_ID(N'dbo.Pacientes', N'U') IS NULL
CREATE TABLE dbo.Pacientes (
    PacienteId INT IDENTITY(1,1) NOT NULL,
    Dni VARCHAR(10) NOT NULL,
    Nombre NVARCHAR(60) NOT NULL,
    Apellido NVARCHAR(60) NOT NULL,
    CONSTRAINT PK_Pacientes PRIMARY KEY (PacienteId),
    CONSTRAINT UQ_Pacientes_Dni UNIQUE (Dni)
);
GO


IF OBJECT_ID(N'dbo.Turnos', N'U') IS NULL
CREATE TABLE dbo.Turnos (
    TurnoId UNIQUEIDENTIFIER NOT NULL,
    PacienteId INT NOT NULL,
    Fecha DATE NOT NULL,
    Hora TIME(0) NOT NULL,
    Estado VARCHAR(20) NOT NULL CONSTRAINT DF_Turnos_Estado DEFAULT 'confirmado',
    CreadoEn DATETIME2(0) NOT NULL CONSTRAINT DF_Turnos_CreadoEn DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Turnos PRIMARY KEY (TurnoId),
    CONSTRAINT FK_Turnos_Pacientes FOREIGN KEY (PacienteId) REFERENCES dbo.Pacientes (PacienteId),
    CONSTRAINT CK_Turnos_Estado CHECK (Estado IN ('confirmado', 'cancelado'))
);
GO


IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Turnos_Fecha_Hora' AND object_id = OBJECT_ID(N'dbo.Turnos'))
    CREATE UNIQUE INDEX UX_Turnos_Fecha_Hora
        ON dbo.Turnos (Fecha, Hora)
        WHERE Estado = 'confirmado';
GO