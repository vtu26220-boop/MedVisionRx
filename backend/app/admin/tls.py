"""Use the operating system CA store without disabling certificate verification."""
def enable_system_certificates():
    try:
        import truststore
    except ImportError:
        return
    truststore.inject_into_ssl()
