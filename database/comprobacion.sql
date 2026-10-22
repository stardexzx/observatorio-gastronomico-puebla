SELECT count(*) AS usuarios_de_prueba
FROM ogp.usuarios
WHERE correo IN (
    'prueba-sql@invalid.example',
    'captura-sql@invalid.example'
);