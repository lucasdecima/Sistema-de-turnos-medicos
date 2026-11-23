

USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'app_turnos')
    CREATE LOGIN app_turnos WITH PASSWORD = N'<CLAVE_DEL_USUARIO>', CHECK_POLICY = ON;
GO

USE SistemaTurnosDB;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'app_turnos')
    CREATE USER app_turnos FOR LOGIN app_turnos;
GO
ALTER ROLE db_datareader ADD MEMBER app_turnos;
ALTER ROLE db_datawriter ADD MEMBER app_turnos;
GO