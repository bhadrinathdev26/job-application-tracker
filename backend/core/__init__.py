"""
Django Core Configuration Package
Initializes PyMySQL to serve as the MySQLdb driver for Django's MySQL backend.
"""
try:
    import pymysql

    # Pretend to be mysqlclient 2.2.7 to satisfy Django's driver version check
    pymysql.version_info = (2, 2, 7, "final", 0)
    pymysql.install_as_MySQLdb()
except ImportError:
    # PyMySQL might not be installed yet during initial environment bootstrap
    pass
