# EWURA Certificate

Place your `advatech.pfx` certificate file in this directory.

The certificate is required for EWURA XML signing functionality.

Set the password in your environment variables:
```
EWURA_P12PASSWORD=your_certificate_password
```

If the certificate is not found, the system will run in simulation mode.